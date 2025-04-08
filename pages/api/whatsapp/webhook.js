import { handleMessage } from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import twilio from 'twilio';
import { closeDB } from '../../../lib/whatsapp/chatbot';
import { sanitizeInput } from '../../../lib/whatsapp/utils';

const { Twilio, validateRequest } = twilio;

// Twilio client
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
    ({ Body: messageBody, From: senderNumber, ProfileName: senderName } = req.body);

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

    await twilioClient.messages.create({
      body: sanitizedResponse,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: senderNumber,
    });

    debugLog('Message Sent Successfully', {
      to: senderNumber,
      timestamp: new Date().toISOString()
    });

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

        await twilioClient.messages.create({
          body: fallbackMessage,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: senderNumber,
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
    } catch (dbError) {
      debugLog('Database Close Failed', { error: dbError.message });
    }
  }
}