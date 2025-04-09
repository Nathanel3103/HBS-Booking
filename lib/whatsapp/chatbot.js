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

    const dbName = process.env.MONGODB_DB_NAME || 'hospital';
    cachedDb = client.db(dbName);
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
        step: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL,
        createdAt: new Date()
      });
      return generateWelcomeMessage();
    }

    // Handle back option
    if (message.toLowerCase() === 'back') {
      return await handleBackOption(userState, db);
    }

    // Handle conversation flow
    switch(userState.step) {
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL:
        return await handleInitialSelection(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.BOOK_APPOINTMENT:
        return await handleServiceSelection(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US:
        return await handleLearnAboutUs(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS:
        return await handlePatientDetails(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION:
        return await handleDateSelection(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION:
        return await handleDoctorSelection(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION:
        return await handleTimeSelection(message, sender, db);
      
      case WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION:
        return await handleConfirmation(message, sender, db);
      
      default:
        return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
    }
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
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS]: WHATSAPP_CONFIG.CONVERSATION.STEPS.BOOK_APPOINTMENT,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.BOOK_APPOINTMENT]: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL,
    [WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US]: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL
  };

  const previousStep = previousSteps[userState.step];
  if (!previousStep) {
    return generateWelcomeMessage();
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender: userState.sender },
    { $set: { step: previousStep } }
  );

  return await getStepMessage(previousStep, userState);
}

async function handleInitialSelection(message, sender, db) {
  const selectedOption = WHATSAPP_CONFIG.CONVERSATION.INITIAL_OPTIONS[message];
  if (!selectedOption) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_OPTION;
  }

  const nextStep = message === '1' 
    ? WHATSAPP_CONFIG.CONVERSATION.STEPS.BOOK_APPOINTMENT 
    : WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US;

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { $set: { step: nextStep } }
  );

  return await getStepMessage(nextStep);
}

async function handleLearnAboutUs(message, sender, db) {
  const aboutUsMessage = `🏥 Welcome to Our Hospital!

We provide comprehensive healthcare services including:
• General Check-ups
• Specialist Consultations
• Vaccinations
• Emergency Care

Our team of experienced doctors is dedicated to providing the best care possible.

To book an appointment, type 'back' and select option 1.`;

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { $set: { step: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL } }
  );

  return aboutUsMessage;
}

async function handlePatientDetails(message, sender, db) {
  const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
  
  if (!userState.patientDetails) {
    userState.patientDetails = {};
  }

  if (!userState.patientDetails.name) {
    if (!validateName(message)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_NAME;
    }
    userState.patientDetails.name = message;
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { $set: { patientDetails: userState.patientDetails } }
    );
    return "📱 Please enter your phone number:";
  }

  if (!userState.patientDetails.phone) {
    if (!validatePhone(message)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_PHONE;
    }
    userState.patientDetails.phone = message;
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { $set: { patientDetails: userState.patientDetails } }
    );
    return "📧 Please enter your email address:";
  }

  if (!userState.patientDetails.email) {
    if (!validateEmail(message)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_EMAIL;
    }
    userState.patientDetails.email = message;
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { $set: { 
        patientDetails: userState.patientDetails,
        step: WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION
      }}
    );
    return "📅 Please enter your preferred date in DD/MM format (e.g., 15/04):";
  }

  return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
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
  const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
  
  if (message.toLowerCase() === 'yes') {
    // Create appointment
    const appointment = {
      doctorId: userState.selectedDoctor._id,
      patientId: userState.patientDetails,
      date: userState.date,
      time: userState.time,
      status: 'confirmed',
      createdAt: new Date()
    };

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).insertOne(appointment);

    // Clear chat state
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });

    return `✅ Appointment confirmed!

Thank you for booking with us. Here are your appointment details:
📅 Date: ${formatDate(userState.date)}
⏰ Time: ${userState.time}
👨‍⚕️ Doctor: Dr. ${userState.selectedDoctor.name}
📍 Location: Hospital Main Building

We look forward to seeing you! If you need to reschedule or cancel, please contact us at least 24 hours before your appointment.

Type 'reset' to start a new conversation.`;
  } else if (message.toLowerCase() === 'no') {
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { $set: { step: WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION } }
    );
    return "Please select a different time slot:";
  }

  return "Please respond with 'yes' to confirm or 'no' to choose a different time slot.";
}

async function getStepMessage(step, userState = null) {
  switch(step) {
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL:
      return generateWelcomeMessage();
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.BOOK_APPOINTMENT:
      return "Please select a service:\n" +
             Object.entries(WHATSAPP_CONFIG.CONVERSATION.SERVICES)
               .map(([key, value]) => `${key}. ${value}`)
               .join('\n');
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS:
      return "👤 Please enter your full name:";
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION:
      return "📅 Please enter your preferred date in DD/MM format (e.g., 15/04):";
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION:
      return formatDoctorListMessage(userState.availableDoctors);
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION:
      return formatTimeSlotsMessage(userState.availableSlots);
    
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION:
      return generateConfirmationMessage(userState);
    
    default:
      return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
} 