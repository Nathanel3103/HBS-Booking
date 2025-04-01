import { handleMessage } from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import { Twilio, validateRequest } from 'twilio';
import rateLimit from 'express-rate-limit';
import { closeDB } from '../../../lib/whatsapp/chatbot';

// Initialize Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'WEBHOOK_URL',
  'MONGODB_URI'
];

function validateEnvVars() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default async function handler(req, res) {
  try {
    // Validate environment variables
    validateEnvVars();

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Apply rate limiting
    try {
      await limiter(req, res);
    } catch (error) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Validate Twilio signature
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = process.env.WEBHOOK_URL;

    const isValid = validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      return res.status(403).json({ error: 'Unauthorized request' });
    }

    // Extract message details from the webhook
    const {
      Body: messageBody,
      From: senderNumber,
      ProfileName: senderName
    } = req.body;

    // Validate required fields
    if (!messageBody || !senderNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Process the incoming message with fallback for empty responses
    const response = await handleMessage(messageBody?.toLowerCase()?.trim(), senderNumber) || "I'm sorry, I didn't understand that.";

    // Send response back via WhatsApp
    await twilioClient.messages.create({
      body: response,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: senderNumber
    });

    // Log the interaction
    console.log(`Message from ${senderName} (${senderNumber}): ${messageBody}`);
    console.log(`Response: ${response}`);

    // Return success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    
    // Default error message with fallback
    const errorMessage = WHATSAPP_CONFIG?.ERRORS?.SYSTEM_ERROR || "Something went wrong. Please try again later.";

    // Try to send error message to user
    try {
      await twilioClient.messages.create({
        body: errorMessage,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: req.body.From
      });
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Clean up database connection
    await closeDB();
  }
} 