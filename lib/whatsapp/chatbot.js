import { MongoClient } from 'mongodb';
import { WHATSAPP_CONFIG } from './config';
import {
  validateDate,
  formatDate,
  isSessionExpired,
  generateConfirmationMessage,
  generateWelcomeMessage,
  sanitizeInput
} from './utils';
import {
  getAvailableTimeSlots,
  getAvailableDoctors,
  formatTimeSlotsMessage,
  formatDoctorListMessage
} from './availability';

let cachedDb = null;
let client = null;

async function setupDatabase(db) {
  try {
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).createIndex(
      { "lastUpdated": 1 },
      { expireAfterSeconds: 900 }
    );

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).createIndex(
      { "sender": 1 },
      { unique: true }
    );

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).createIndex(
      { "sender": 1, "lastUpdated": -1 }
    );
  } catch (error) {
    console.error('Database index setup error:', error);
  }
}

async function connectDB() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 2000;
  const CONNECTION_TIMEOUT = 15000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (cachedDb && client) {
        try {
          await client.db().admin().ping();
          return cachedDb;
        } catch (e) {
          console.log('Stale connection detected, reconnecting...');
          await closeDB();
        }
      }
      
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      client = await MongoClient.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 60000,
        keepAlive: true,
      });

      await client.db().admin().ping();
      
      cachedDb = client.db('healthcare');
      
      setupDatabase(cachedDb).catch(error => {
        console.error('Error setting up database indexes:', error);
      });
      
      console.log('Successfully connected to MongoDB');
      return cachedDb;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, {
        error: error.message,
        attempt,
        maxRetries: MAX_RETRIES
      });
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to connect to database after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function closeDB() {
  try {
    if (client) {
      await client.close(true);
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  } finally {
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
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    
    message = message.toString().trim().toLowerCase();
    sender = sender.toString().trim();

    console.log('Processing message:', { sender, messageLength: message.length });

    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });

    // Handle initial message or reset command
    if (!userState || message === 'reset') {
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
      throw error;
    }

    // Update last interaction time
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { lastUpdated: new Date() },
        $inc: { messageCount: 1 }
      }
    );

    return response || WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  } catch (error) {
    console.error('Chatbot error:', {
      error: error.message,
      stack: error.stack,
      sender,
      message
    });
    
    if (error.name === 'MongoNetworkError') {
      return WHATSAPP_CONFIG.ERRORS.DB_ERROR;
    }
    if (error.message?.includes('validation')) {
      return error.message;
    }
    
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleServiceSelection(message, sender, db) {
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
      }
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

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).insertOne({
      patient: sender,
      doctor: selectedDoctor,
      service: userState.service,
      date: userState.date,
      time: userState.time,
      status: 'confirmed',
      createdAt: new Date()
    });

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