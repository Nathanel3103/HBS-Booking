import { handleMessage } from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import { Twilio, validateRequest } from 'twilio';
import { closeDB } from '../../../lib/whatsapp/chatbot';

// Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Fallback in-memory rate limiter (lightweight, not for production scale)
const ipRequestCounts = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 100;

  const user = ipRequestCounts.get(ip) || { count: 0, lastRequest: now };
  if (now - user.lastRequest > windowMs) {
    user.count = 1;
    user.lastRequest = now;
  } else {
    user.count += 1;
  }
  ipRequestCounts.set(ip, user);
  return user.count > maxRequests;
}

// Vercel API route
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Twilio signature validation
    const signature = req.headers['x-twilio-signature'];
    const url = process.env.WEBHOOK_URL;

    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      return res.status(403).json({ error: 'Unauthorized request' });
    }

    const { Body: messageBody, From: senderNumber, ProfileName: senderName } = req.body;

    if (!messageBody || !senderNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanedMessage = messageBody.toLowerCase().trim();
    const response =
      (await handleMessage(cleanedMessage, senderNumber)) ||
      "I'm sorry, I didn't understand that.";

    await twilioClient.messages.create({
      body: response,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: senderNumber,
    });

    console.log(`Message from ${senderName || 'Unknown'} (${senderNumber}): ${messageBody}`);
    console.log(`Response: ${response}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);

    const fallbackMessage =
      WHATSAPP_CONFIG?.ERRORS?.SYSTEM_ERROR ||
      'Something went wrong. Please try again later.';

    try {
      if (req.body?.From) {
        await twilioClient.messages.create({
          body: fallbackMessage,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: req.body.From,
        });
      }
    } catch (sendError) {
      console.error('Error sending fallback message:', sendError);
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await closeDB();
  }
}
