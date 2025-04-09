import { MongoClient } from 'mongodb';
import { WHATSAPP_CONFIG } from './config';
import {
  validateDate,
  formatDate,
  isSessionExpired,
  validateName,
  validatePhone,
  validateEmail,
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

export async function connectDB() {
  try {
    if (cachedDb) {
      try {
        await cachedDb.command({ ping: 1 });
        return cachedDb;
      } catch (error) {
        console.log('Cached connection is stale, creating new connection');
        cachedDb = null;
        if (client) {
          await client.close();
          client = null;
        }
      }
    }
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = await MongoClient.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    cachedDb = client.db('healthcare');
    return cachedDb;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

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
  let db;
  try {
    db = await connectDB();
    const normalizedSender = sender.replace('whatsapp:', '');
    const normalizedMessage = message.toLowerCase().trim();

    console.log('Processing message:', {
      originalMessage: message,
      normalizedSender,
      timestamp: new Date().toISOString()
    });

    let userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ 
      sender: normalizedSender 
    });

    console.log('Initial user state:', userState);

    // Handle new session or reset
    if (!userState || normalizedMessage === 'reset' || isSessionExpired(userState)) {
      console.log('Creating new session for user');
      const newState = {
        sender: normalizedSender,
        step: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL,
        createdAt: new Date(),
        lastUpdated: new Date(),
        patientDetails: {},
        attempts: 0
      };
      
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ 
        sender: normalizedSender 
      });
      
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).insertOne(newState);
      return generateWelcomeMessage();
    }

    // Handle back option
    if (normalizedMessage === 'back') {
      return await handleBackOption(userState, db);
    }

    // Process current step
    let response;
    switch(userState.step) {
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL:
        response = await handleInitialSelection(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS:
        response = await handlePatientDetails(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION:
        response = await handleDateSelection(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION:
        response = await handleDoctorSelection(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION:
        response = await handleTimeSelection(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION:
        response = await handleConfirmation(message, normalizedSender, db);
        break;
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US:
        response = await handleLearnAboutUs(message, normalizedSender, db);
        break;
      
      default:
        console.error('Unhandled step:', userState.step);
        response = WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
    }

    // Verify state was updated
    const updatedState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ 
      sender: normalizedSender 
    });
    console.log('Final state after processing:', updatedState);

    return response;
  } catch (error) {
    console.error('Chatbot error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleBackOption(userState, db) {
  const previousSteps = {
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS]: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US]: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL
  };

  const previousStep = previousSteps[userState.step];
  if (!previousStep) {
    return generateWelcomeMessage();
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender: userState.sender },
    { $set: { step: previousStep, lastUpdated: new Date() } }
  );

  return await getStepMessage(previousStep, userState);
}

async function handleInitialSelection(message, sender, db) {
  const normalizedInput = message.toLowerCase().trim();
  
  let nextStep;
  let selectedOption;

  if (normalizedInput === '1' || normalizedInput.includes('appointment')) {
    selectedOption = WHATSAPP_CONFIG.CONVERSATION.INITIAL_OPTIONS['1'];
    nextStep = WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS;
  } else if (normalizedInput === '2' || normalizedInput.includes('about')) {
    selectedOption = WHATSAPP_CONFIG.CONVERSATION.INITIAL_OPTIONS['2'];
    nextStep = WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US;
  }

  if (!selectedOption) {
    return `❌ Invalid option. Please select:
1. Book Appointment
2. Learn About Us`;
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { 
      $set: { 
        step: nextStep,
        selectedOption,
        lastUpdated: new Date(),
        patientDetails: {}
      }
    }
  );

  if (nextStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS) {
    return "👤 Please enter your full name:";
  } else {
    return `🏥 Welcome to Our Hospital!
    
We provide comprehensive healthcare services.
To book an appointment, type 'back' and select option 1.`;
  }
}

// Other handler functions (handlePatientDetails, handleDateSelection, etc.)
// would follow the same pattern with proper state updates