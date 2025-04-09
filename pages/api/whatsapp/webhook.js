import { handleMessage } from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import twilio from 'twilio';
import { closeDB } from '../../../lib/whatsapp/chatbot';
import { sanitizeInput } from '../../../lib/whatsapp/utils';
import { connectDB } from '../../../lib/whatsapp/chatbot';

const { Twilio, validateRequest } = twilio;

// Twilio client initialization
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Enhanced rate limiter with Redis-like functionality
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now - data.windowStart > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  async consume(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let data = this.requests.get(key) || { 
      windowStart: now,
      count: 0,
      history: []
    };

    // Remove old requests from history
    data.history = data.history.filter(time => time > windowStart);
    
    // Reset if window has passed
    if (data.windowStart < windowStart) {
      data = { 
        windowStart: now,
        count: 0,
        history: []
      };
    }

    // Check if limit exceeded
    if (data.history.length >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    // Add new request
    data.count++;
    data.history.push(now);
    this.requests.set(key, data);

    return {
      remaining: this.maxRequests - data.history.length,
      resetTime: new Date(data.windowStart + this.windowMs)
    };
  }
}

const rateLimiter = new RateLimiter();

// Enhanced debug logging with redaction
function debugLog(step, data) {
  const redactedData = {
    ...data,
    // Redact sensitive information
    body: data.body ? '[REDACTED]' : undefined,
    signature: data.signature ? '[REDACTED]' : undefined,
    authToken: data.authToken ? '[REDACTED]' : undefined,
    // Shorten long messages
    message: data.message ? data.message.substring(0, 50) + (data.message.length > 50 ? '...' : '') : undefined
  };
  
  console.log('DEBUG -', step, ':', JSON.stringify(redactedData, null, 2));
}

export default async function handler(req, res) {
  let messageBody, senderNumber, senderName;
  const messageId = req.body?.MessageSid || '';
  
  debugLog('Request Started', {
    method: req.method,
    headers: Object.keys(req.headers),
    body: req.body ? 'Present' : 'Missing',
    timestamp: new Date().toISOString()
  });
  
  try {
    if (req.method !== 'POST') {
      debugLog('Method Not Allowed', { method: req.method });
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract message details
    messageBody = req.body?.Body || '';
    senderNumber = req.body?.From || '';
    senderName = req.body?.ProfileName || 'Unknown';

    // Remove "whatsapp:" prefix from sender number if present
    if (senderNumber.startsWith('whatsapp:')) {
      senderNumber = senderNumber.substring(9);
    }

    // Check if we've already processed this message
    const db = await connectDB();
    const processedMessage = await db.collection('processed_messages').findOne({ messageId });
    if (processedMessage) {
      debugLog('Duplicate Message', { messageId });
      return res.status(200).json({ success: true, message: 'Message already processed' });
    }

    // Mark message as processed
    await db.collection('processed_messages').insertOne({
      messageId,
      sender: senderNumber,
      timestamp: new Date(),
      processed: true
    });

    debugLog('Message Received', {
      bodyLength: messageBody?.length,
      sender: senderNumber ? 'Present' : 'Missing',
      name: senderName ? 'Present' : 'Missing'
    });

    if (!messageBody || !senderNumber) {
      debugLog('Missing Fields', { 
        bodyPresent: !!messageBody, 
        senderPresent: !!senderNumber 
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enhanced rate limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const rateLimitKey = `${ip}:${senderNumber || 'unknown'}`;

    // Check cooldown period
    const lastMessage = await db.collection('processed_messages')
      .findOne({ sender: senderNumber }, { sort: { timestamp: -1 } });
    
    if (lastMessage) {
      const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
      const cooldownPeriod = 2000; // 2 seconds cooldown
      
      if (timeSinceLastMessage < cooldownPeriod) {
        debugLog('Cooldown Active', { 
          timeSinceLastMessage,
          cooldownPeriod
        });
        return res.status(200).json({ 
          success: true, 
          message: 'Please wait before sending another message' 
        });
      }
    }

    debugLog('Rate Limit Check', { 
      ip: ip ? 'Present' : 'Missing',
      rateLimitKey: rateLimitKey ? 'Present' : 'Missing'
    });

    try {
      const rateLimitInfo = await rateLimiter.consume(rateLimitKey);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());
    } catch (error) {
      if (error.message === 'Rate limit exceeded') {
        debugLog('Rate Limit Exceeded', { 
          ip: ip ? 'Present' : 'Missing',
          sender: senderNumber ? 'Present' : 'Missing'
        });
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: Math.ceil(rateLimiter.windowMs / 1000)
        });
      }
      throw error;
    }

    // Twilio signature validation
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}${req.url}`;

    debugLog('Twilio Validation', {
      signature: signature ? 'Present' : 'Missing',
      url: url
    });

    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      debugLog('Invalid Signature', { validationFailed: true });
      return res.status(403).json({ error: 'Unauthorized request' });
    }

    // Sanitize inputs
    const cleanedMessage = sanitizeInput(messageBody.toLowerCase().trim());
    const cleanedSenderName = sanitizeInput(senderName || 'Unknown');

    debugLog('Processing Message', {
      from: cleanedSenderName,
      number: senderNumber,
      messageLength: cleanedMessage.length,
      timestamp: new Date().toISOString()
    });

    const response = await handleMessage(cleanedMessage, senderNumber);
    
    debugLog('Handler Response', {
      responseLength: response?.length,
      timestamp: new Date().toISOString()
    });

    if (!response) {
      debugLog('Empty Response', { error: 'No response from handleMessage' });
      throw new Error('No response received from handleMessage');
    }

    // Sanitize response before sending
    const sanitizedResponse = sanitizeInput(response);

    debugLog('Sending Response', {
      to: senderNumber,
      responseLength: sanitizedResponse.length
    });

    try {
      // Ensure the to number has the whatsapp: prefix if not already present
      const toNumber = senderNumber.startsWith('whatsapp:') ? 
        senderNumber : 
        `whatsapp:${senderNumber}`;
        
      await twilioClient.messages.create({
        body: sanitizedResponse,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: toNumber,
      });

      debugLog('Message Sent Successfully', {
        to: toNumber,
        timestamp: new Date().toISOString()
      });
    } catch (sendError) {
      debugLog('Twilio Send Error', {
        error: sendError.message,
        errorCode: sendError.code,
        to: senderNumber
      });
      // Re-throw to be caught by the outer try/catch
      throw sendError;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    debugLog('Error Occurred', {
      errorName: error.name,
      errorMessage: error.message,
      sender: senderNumber,
      messagePresent: !!messageBody
    });

    const fallbackMessage = WHATSAPP_CONFIG?.ERRORS?.SYSTEM_ERROR ||
      'Something went wrong. Please try again later.';

    try {
      if (senderNumber) {
        debugLog('Sending Fallback', {
          to: senderNumber,
          messageLength: fallbackMessage.length
        });

        // Ensure the to number has the whatsapp: prefix if not already present
        const toNumber = senderNumber.startsWith('whatsapp:') ? 
          senderNumber : 
          `whatsapp:${senderNumber}`;

        await twilioClient.messages.create({
          body: fallbackMessage,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: toNumber,
        });
      }
    } catch (sendError) {
      debugLog('Fallback Failed', {
        error: sendError.message,
        sender: senderNumber
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    try {
      await closeDB();
      debugLog('Database Closed', { success: true });
      
      // Cleanup old processed messages (older than 24 hours)
      const db = await connectDB();
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await db.collection('processed_messages').deleteMany({
        timestamp: { $lt: cutoffTime }
      });
      await closeDB();
    } catch (dbError) {
      debugLog('Database Close Failed', { error: dbError.message });
    }
  }
}