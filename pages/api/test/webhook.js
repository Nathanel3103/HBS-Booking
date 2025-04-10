import { 
  handleMessage,
  connectToDatabase,
  closeDB
} from '../../../lib/whatsapp/chatbot';
import { WHATSAPP_CONFIG } from '../../../lib/whatsapp/config';
import twilio from 'twilio';
import { sanitizeInput } from '../../../lib/whatsapp/utils';
import { validateRequest } from 'twilio';


async function connectWithRetry() {
  let retries = 0;
  while (retries < 3) {
    try {

      return await connectToDatabase();
    } catch (err) {
      retries++;
      if (retries >= MAX_RETRIES) throw err;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

export default async function handler(req, res) {
  const {m, msidn} = req.query;
  
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!m || !msidn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
   
    const cleanedMessage = sanitizeInput(m.toLowerCase().trim());
    const response = await handleMessage(cleanedMessage, msidn) || 
      'Sorry, I couldn\'t process your request. Please try again later.';


    return res.status(200).json({ response });

  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
