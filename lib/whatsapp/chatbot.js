import { MongoClient } from 'mongodb';
import { WHATSAPP_CONFIG } from './config';
import {
  validateDate,
  formatDate,
  isSessionExpired,
  generateConfirmationMessage,
  generateWelcomeMessage
} from './utils';
import {
  getAvailableTimeSlots,
  getAvailableDoctors,
  formatTimeSlotsMessage,
  formatDoctorListMessage
} from './availability';

let cachedDb = null;
let client = null;

async function connectDB() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (cachedDb) return cachedDb;
      
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      client = await MongoClient.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      // Test the connection
      await client.db().admin().ping();
      
      cachedDb = client.db('healthcare');
      return cachedDb;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Improve cleanup function
export async function closeDB() {
  try {
    if (client) {
      await Promise.race([
        client.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database close timeout')), 5000)
        )
      ]);
      client = null;
      cachedDb = null;
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    // Force cleanup even if close fails
    client = null;
    cachedDb = null;
  }
}

export async function handleMessage(message, sender) {
  if (!message || !sender) {
    console.error('Missing required parameters:', { message, sender });
    return WHATSAPP_CONFIG.ERRORS.MISSING_FIELDS;
  }

  let db;
  try {
    db = await connectDB();
    
    // Sanitize and trim input
    message = message.toString().trim();
    sender = sender.toString().trim();

    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });

    // Rate limiting check (if user has made too many requests recently)
    const recentMessages = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES)
      .find({ 
        sender,
        lastUpdated: { $gt: new Date(Date.now() - 60000) } // Last minute
      })
      .count();

    if (recentMessages > 20) { // More than 20 messages per minute
      return WHATSAPP_CONFIG.ERRORS.RATE_LIMIT;
    }

    // Handle initial message or reset command
    if (!userState || message.toLowerCase() === 'reset') {
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        {
          $set: {
            step: 'service_selection',
            createdAt: new Date(),
            lastUpdated: new Date(),
            messageCount: 1
          }
        },
        { upsert: true }
      );
      return generateWelcomeMessage();
    }

    // Check for session expiry
    if (isSessionExpired(userState)) {
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        {
          $set: {
            step: 'service_selection',
            createdAt: new Date(),
            lastUpdated: new Date(),
            messageCount: 1
          }
        }
      );
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED + '\n\n' + generateWelcomeMessage();
    }

    // Handle conversation flow based on current step
    let response;
    try {
      switch(userState.step) {
        case 'service_selection':
          response = await handleServiceSelection(message, sender, db);
          break;
        
        case 'date_selection':
          response = await handleDateSelection(message, sender, db);
          break;
        
        case 'time_selection':
          response = await handleTimeSelection(message, sender, db);
          break;
        
        case 'doctor_selection':
          response = await handleDoctorSelection(message, sender, db);
          break;
        
        case 'confirmation':
          response = await handleConfirmation(message, sender, db);
          break;
        
        default:
          console.error('Invalid step encountered:', userState.step);
          response = WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
      }
    } catch (error) {
      console.error('Error in conversation flow:', error);
      throw error; // Re-throw to be caught by outer try-catch
    }

    // Update last interaction time and message count
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { lastUpdated: new Date() },
        $inc: { messageCount: 1 }
      }
    );

    return response;
  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Handle specific error types
    if (error.name === 'MongoNetworkError') {
      return WHATSAPP_CONFIG.ERRORS.DB_ERROR;
    }
    if (error.message?.includes('validation')) {
      return error.message; // Return validation error messages directly
    }
    
    // Log the error for debugging but return a generic error to the user
    console.error('Unexpected error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  } finally {
    // If there was a critical database error, attempt to reset the connection
    if (error?.name === 'MongoNetworkError') {
      try {
        await closeDB();
      } catch (closeError) {
        console.error('Error while closing DB connection:', closeError);
      }
    }
  }
}

async function handleServiceSelection(message, sender, db) {
  // Trim the message to handle any whitespace
  const selectedService = WHATSAPP_CONFIG.CONVERSATION.SERVICES[message.trim()];
  if (!selectedService) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_SERVICE;
  }

  try {
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          service: selectedService,
          step: 'date_selection',
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );

    return '📅 Please enter your preferred date in DD/MM format (e.g., 15/04):';
  } catch (error) {
    console.error('Error in handleServiceSelection:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDateSelection(message, sender, db) {
  try {
    if (!validateDate(message)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
    }

    const [_, day, month] = message.match(/^(\d{2})\/(\d{2})(?:\/\d{4})?$/);
    const selectedDate = new Date(new Date().getFullYear(), month - 1, day);

    // Get available time slots for the selected date
    const availableSlots = await getAvailableTimeSlots(db, selectedDate);
    
    if (!availableSlots || availableSlots.length === 0) {
      return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_SLOTS;
    }

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          date: selectedDate,
          availableSlots,
          step: 'time_selection'
        }
      }
    );

    return formatTimeSlotsMessage(availableSlots);
  } catch (error) {
    // Return the specific validation error message
    return error.message || WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
  }
}

async function handleTimeSelection(message, sender, db) {
  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    const selectedIndex = parseInt(message) - 1;
    const availableSlots = userState.availableSlots;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= availableSlots.length) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_SLOT_SELECTION;
    }

    const selectedTime = availableSlots[selectedIndex];

    // Get available doctors for the selected service, date, and time
    const availableDoctors = await getAvailableDoctors(
      db,
      userState.service,
      userState.date,
      selectedTime
    );

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          time: selectedTime,
          availableDoctors,
          step: 'doctor_selection'
        }
      }
    );

    return formatDoctorListMessage(availableDoctors);
  } catch (error) {
    // Handle specific error messages
    if (error.message === WHATSAPP_CONFIG.ERRORS.SLOT_EXPIRED) {
      return WHATSAPP_CONFIG.ERRORS.SLOT_EXPIRED;
    } else if (error.message === WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE) {
      return WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE;
    } else if (error.message === WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS) {
      return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS;
    }
    console.error('Error in handleTimeSelection:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDoctorSelection(message, sender, db) {
  const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
  const selectedIndex = parseInt(message) - 1;
  const availableDoctors = userState.availableDoctors;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= availableDoctors.length) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_DOCTOR;
  }

  const selectedDoctor = availableDoctors[selectedIndex];

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { 
      $set: { 
        doctor: selectedDoctor,
        step: 'confirmation'
      }
    }
  );

  return `📋 Please confirm your appointment:\n\n` +
         `🏥 Service: ${userState.service}\n` +
         `📅 Date: ${formatDate(userState.date)}\n` +
         `⏰ Time: ${userState.time}\n` +
         `👨‍⚕️ Doctor: ${selectedDoctor.name}\n\n` +
         `Reply with "confirm" to book or "cancel" to start over.`;
}

async function handleConfirmation(message, sender, db) {
  if (message === 'cancel') {
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });
    return generateWelcomeMessage();
  }

  if (message !== 'confirm') {
    return '❓ Please reply with "confirm" to book or "cancel" to start over.';
  }

  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
    // Verify slot availability one final time before booking
    const availableDoctors = await getAvailableDoctors(
      db,
      userState.service,
      userState.date,
      userState.time
    );

    const selectedDoctor = availableDoctors.find(d => d._id.equals(userState.doctor._id));
    if (!selectedDoctor) {
      return WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE;
    }

    // Create appointment
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).insertOne({
      patient: sender,
      doctor: selectedDoctor,
      service: userState.service,
      date: userState.date,
      time: userState.time,
      status: 'confirmed',
      createdAt: new Date()
    });

    // Clean up chat state
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });

    return generateConfirmationMessage(userState);
  } catch (error) {
    console.error('Error in handleConfirmation:', error);
    if (error.message === WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE) {
      return WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE;
    }
    return WHATSAPP_CONFIG.ERRORS.BOOKING_FAILED;
  }
} 