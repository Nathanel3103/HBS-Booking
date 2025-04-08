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

// Make this function available for import
export async function connectDB() {
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

    cachedDb = client.db('healthcare');
    return cachedDb;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

// Cleanup function to close database connection
export async function closeDB() {
  try {
    if (client) {
      await client.close();
      client = null;
      cachedDb = null;
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export async function handleMessage(message, sender) {
  try {
    const db = await connectDB();
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });

    // Handle initial message, reset, or expired session
    if (!userState || message === 'reset' || isSessionExpired(userState)) {
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).insertOne({
        sender,
        step: 'service_selection',
        createdAt: new Date()
      });
      return generateWelcomeMessage();
    }

    // Handle conversation flow
    switch(userState.step) {
      case 'service_selection':
        return await handleServiceSelection(message, sender, db);
      
      case 'date_selection':
        return await handleDateSelection(message, sender, db);
      
      case 'time_selection':
        return await handleTimeSelection(message, sender, db);
      
      case 'doctor_selection':
        return await handleDoctorSelection(message, sender, db);
      
      case 'confirmation':
        return await handleConfirmation(message, sender, db);
      
      default:
        return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleServiceSelection(message, sender, db) {
  const selectedService = WHATSAPP_CONFIG.CONVERSATION.SERVICES[message];
  if (!selectedService) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_SERVICE;
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { 
      $set: { 
        service: selectedService,
        step: 'date_selection'
      }
    }
  );

  return '📅 Please enter your preferred date in DD/MM format (e.g., 15/04):';
}

async function handleDateSelection(message, sender, db) {
  if (!validateDate(message)) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
  }

  const [_, day, month] = message.match(/^(\d{2})\/(\d{2})$/);
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