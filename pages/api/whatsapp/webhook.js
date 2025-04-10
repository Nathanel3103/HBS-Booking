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

// Add connection retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function connectWithRetry() {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      return await connectDB();
    } catch (err) {
      retries++;
      if (retries >= MAX_RETRIES) throw err;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

export default async function handler(req, res) {
  let messageBody, senderNumber, senderName, db;
  const messageId = req.body?.MessageSid || '';
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Extract message details
    messageBody = req.body?.Body || '';
    senderNumber = req.body?.From || '';
    senderName = req.body?.ProfileName || 'Unknown';

    if (!messageBody || !senderNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Remove "whatsapp:" prefix from sender number if present
    if (senderNumber.startsWith('whatsapp:')) {
      senderNumber = senderNumber.substring(9);
    }

    // Connect to database once
    db = await connectWithRetry();

    // Basic rate limiting
    const lastMessage = await db.collection('processed_messages')
      .findOne({ sender: senderNumber }, { sort: { timestamp: -1 } });
    
    if (lastMessage) {
      const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();
      if (timeSinceLastMessage < 2000) { // 2 second cooldown
        return res.status(200).json({ success: true });
      }
    }

    // Process the message
    const cleanedMessage = sanitizeInput(messageBody.toLowerCase().trim());
    const response = await handleMessage(cleanedMessage, senderNumber) || 
      'Sorry, I couldn\'t process your request. Please try again later.';
    
    // Send response via Twilio
    const toNumber = senderNumber.startsWith('whatsapp:') ? 
      senderNumber : 
      `whatsapp:${senderNumber}`;
      
    try {
      await twilioClient.messages.create({
        body: sanitizeInput(response),
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: toNumber,
      });
    } catch (error) {
      if (error.code === 63038) {
        console.log('Twilio daily limit reached');
        return res.status(429).json({ error: 'Daily message limit reached' });
      }
      throw error;
    }

    // Record the processed message
    await db.collection('processed_messages').insertOne({
      messageId,
      sender: senderNumber,
      timestamp: new Date(),
      processed: true
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    
    // Send a simple error response to avoid timeouts
    return res.status(500).json({ error: 'Internal server error' });
    
  } finally {
    if (db) {
      try {
        await closeDB();
      } catch (dbError) {
        console.error('Error closing DB:', dbError);
      }
    }
  }
}