import { handleMessage } from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import { Twilio, validateRequest } from 'twilio';
import { closeDB } from '../../../lib/whatsapp/chatbot';
import { sanitizeInput } from '../../../lib/whatsapp/utils';

// Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Redis-based rate limiter (simplified for example)
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

// Debug logging function
function debugLog(step, data) {
  console.log('DEBUG -', step, ':', JSON.stringify(data, null, 2));
}

// Vercel API route
export default async function handler(req, res) {
  let messageBody, senderNumber, senderName;
  
  debugLog('Request Started', {
    method: req.method,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
  
  try {
    if (req.method !== 'POST') {
      debugLog('Method Not Allowed', { method: req.method });
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract message details early
    ({ Body: messageBody, From: senderNumber, ProfileName: senderName } = req.body);

    debugLog('Message Details', {
      body: messageBody,
      sender: senderNumber,
      name: senderName
    });

    if (!messageBody || !senderNumber) {
      debugLog('Missing Fields', { body: messageBody, sender: senderNumber });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enhanced rate limiting with IP and WhatsApp number
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const rateLimitKey = `${ip}:${senderNumber || 'unknown'}`;

    debugLog('Rate Limit Check', { ip, rateLimitKey });

    try {
      const rateLimitInfo = await rateLimiter.consume(rateLimitKey);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime.toISOString());
    } catch (error) {
      if (error.message === 'Rate limit exceeded') {
        debugLog('Rate Limit Exceeded', { ip, sender: senderNumber });
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: Math.ceil(rateLimiter.windowMs / 1000)
        });
      }
      throw error;
    }

    // Twilio signature validation
    const signature = req.headers['x-twilio-signature'];
    const url = process.env.WEBHOOK_URL;

    debugLog('Twilio Validation', {
      signature: signature ? 'Present' : 'Missing',
      url: url ? 'Present' : 'Missing'
    });

    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      debugLog('Invalid Signature', { signature });
      return res.status(403).json({ error: 'Unauthorized request' });
    }

    // Sanitize inputs
    const cleanedMessage = sanitizeInput(messageBody.toLowerCase().trim());
    const cleanedSenderName = sanitizeInput(senderName || 'Unknown');

    debugLog('Processing Message', {
      from: cleanedSenderName,
      number: senderNumber,
      message: cleanedMessage,
      timestamp: new Date().toISOString()
    });

    const response = await handleMessage(cleanedMessage, senderNumber);
    
    debugLog('Handler Response', {
      response,
      timestamp: new Date().toISOString()
    });

    if (!response) {
      throw new Error('No response received from handleMessage');
    }

    // Sanitize response before sending
    const sanitizedResponse = sanitizeInput(response);

    debugLog('Sending Response', {
      to: senderNumber,
      response: sanitizedResponse
    });

    await twilioClient.messages.create({
      body: sanitizedResponse,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: senderNumber,
    });

    debugLog('Message Sent Successfully', {
      to: cleanedSenderName,
      response: sanitizedResponse,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true });
  } catch (error) {
    debugLog('Error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      sender: senderNumber,
      messageBody
    });

    const fallbackMessage =
      WHATSAPP_CONFIG?.ERRORS?.SYSTEM_ERROR ||
      'Something went wrong. Please try again later.';

    try {
      if (senderNumber) {
        debugLog('Sending Fallback Message', {
          to: senderNumber,
          message: fallbackMessage
        });

        await twilioClient.messages.create({
          body: fallbackMessage,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: senderNumber,
        });
      }
    } catch (sendError) {
      debugLog('Fallback Message Error', {
        error: sendError.message,
        sender: senderNumber
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    try {
      await closeDB();
      debugLog('Database Connection Closed', { timestamp: new Date().toISOString() });
    } catch (dbError) {
      debugLog('Database Close Error', { error: dbError.message });
    }
  }
}