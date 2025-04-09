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
    // If we have a cached connection and it's alive, use it
    if (cachedDb) {
      try {
        // Test the connection
        await cachedDb.command({ ping: 1 });
        return cachedDb;
      } catch (error) {
        console.log('Cached connection is stale, creating new connection');
        // Connection is stale, clear it
        cachedDb = null;
        if (client) {
          try {
            await client.close();
          } catch (closeError) {
            console.error('Error closing stale connection:', closeError);
          }
          client = null;
        }
      }
    }
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Add retry logic for connection
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        client = await MongoClient.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
          maxPoolSize: 50,
          retryWrites: true,
          w: 'majority'
        });

        const dbName = process.env.MONGODB_DB_NAME || 'hospital';
        cachedDb = client.db(dbName);
        
        // Test the connection
        await cachedDb.command({ ping: 1 });
        console.log('Successfully connected to database');
        return cachedDb;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`Retrying database connection, ${retries} attempts remaining`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Failed to connect to database after multiple attempts: ${lastError.message}`);
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
}

// Improved cleanup function
export async function closeDB() {
  try {
    if (client) {
      console.log('Closing database connection');
      await client.close();
      client = null;
      cachedDb = null;
      console.log('Database connection closed successfully');
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
    // Reset the connections even if there's an error
    client = null;
    cachedDb = null;
  }
}

export async function handleMessage(message, sender) {
  let db;
  try {
    db = await connectDB();
    
    // Normalize sender number and message
    const normalizedSender = sender.replace('whatsapp:', '');
    const normalizedMessage = message.toLowerCase().trim();
    
    console.log('Processing message:', {
      originalMessage: message,
      normalizedMessage,
      normalizedSender,
      timestamp: new Date().toISOString()
    });

    // Get user state with error handling
    let userState;
    try {
      userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ 
        sender: normalizedSender 
      });
      console.log('Initial user state:', userState);
    } catch (dbError) {
      console.error('Error fetching user state:', dbError);
      throw new Error('Failed to fetch user state');
    }

    // Handle session management
    if (!userState || normalizedMessage === 'reset' || isSessionExpired(userState)) {
      console.log('Creating new session for user');
      try {
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
        userState = newState;
        return generateWelcomeMessage();
      } catch (stateError) {
        console.error('Error creating new session:', stateError);
        throw new Error('Failed to create new session');
      }
    }

    // Handle back option with error handling
    if (normalizedMessage === 'back') {
      try {
        const response = await handleBackOption(userState, db);
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
          { sender: normalizedSender },
          { $set: { lastUpdated: new Date() } }
        );
        return response;
      } catch (backError) {
        console.error('Error handling back option:', backError);
        throw new Error('Failed to process back option');
      }
    }

    // Validate current step
    if (!WHATSAPP_CONFIG.CONVERSATION.STEPS[userState.step]) {
      console.error('Invalid step detected:', userState.step);
      try {
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ 
          sender: normalizedSender 
        });
        return generateWelcomeMessage();
      } catch (deleteError) {
        console.error('Error resetting invalid state:', deleteError);
        throw new Error('Failed to reset invalid state');
      }
    }

    // Handle conversation flow with attempt tracking
    console.log('Processing step:', userState.step);
    
    let response;
    try {
      // Increment attempt counter for the current step
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender: normalizedSender },
        { $inc: { attempts: 1 } }
      );

      // Check if max attempts exceeded
      if (userState.attempts >= WHATSAPP_CONFIG.CONVERSATION.MAX_RETRIES) {
        console.log('Max attempts exceeded, resetting conversation');
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ 
          sender: normalizedSender 
        });
        return "You've exceeded the maximum number of attempts. Let's start over:\n\n" + 
               generateWelcomeMessage();
      }

      // Process step
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
          throw new Error('Unhandled conversation step');
      }

      // Reset attempts on successful response
      if (response) {
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
          { sender: normalizedSender },
          { 
            $set: { 
              lastUpdated: new Date(),
              attempts: 0 
            }
          }
        );
      }

    } catch (stepError) {
      console.error('Error processing step:', stepError);
      throw new Error(`Failed to process step ${userState.step}: ${stepError.message}`);
    }

    // Verify final state
    try {
      const updatedState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ 
        sender: normalizedSender 
      });
      console.log('Final state after processing:', updatedState);

      if (!updatedState) {
        throw new Error('State verification failed: state not found after update');
      }
    } catch (verifyError) {
      console.error('Error verifying final state:', verifyError);
      // Don't throw here, as we still want to return the response
    }

    return response;
  } catch (error) {
    console.error('Chatbot error:', error);
    // Return a user-friendly error message based on the error type
    if (error.message.includes('database')) {
      return WHATSAPP_CONFIG.ERRORS.DB_ERROR;
    } else if (error.message.includes('session')) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    } else {
      return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
    }
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
  console.log('Handling initial selection:', message);

  // Normalize input
  const normalizedInput = message.toLowerCase().trim();
  
  // Handle various input formats with more flexible matching
  let nextStep;
  let selectedOption;

  if (normalizedInput === '1' || 
      normalizedInput === 'book' || 
      normalizedInput === 'book appointment' ||
      normalizedInput.includes('appointment')) {
    selectedOption = WHATSAPP_CONFIG.CONVERSATION.INITIAL_OPTIONS['1'];
    nextStep = WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS;
  } else if (normalizedInput === '2' || 
             normalizedInput === 'learn' || 
             normalizedInput === 'learn about us' ||
             normalizedInput.includes('about')) {
    selectedOption = WHATSAPP_CONFIG.CONVERSATION.INITIAL_OPTIONS['2'];
    nextStep = WHATSAPP_CONFIG.CONVERSATION.STEPS.LEARN_ABOUT_US;
  }

  if (!selectedOption) {
    console.log('Invalid option selected:', message);
    return `❌ Invalid option. Please select:
1. Book Appointment
2. Learn About Us

Or type the option you want (e.g., "book" or "learn").`;
  }

  console.log('Updating user state to:', nextStep);

  try {
    // Update the user's state with both step and selection
    const result = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          step: nextStep,
          lastUpdated: new Date(),
          selectedOption,
          patientDetails: {} // Initialize patient details object
        }
      },
      { upsert: true } // Create if doesn't exist
    );

    console.log('Database update result:', result);

    if (result.matchedCount === 0 && !result.upsertedId) {
      console.error('Failed to update user state');
      return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
    }

    // Get the updated user state to verify the change
    const updatedState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    console.log('Updated user state:', updatedState);

    // Return appropriate response based on next step
    if (nextStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS) {
      return "👤 Please enter your full name:";
    } else {
      return `🏥 Welcome to Our Hospital!

We provide comprehensive healthcare services including:
• General Check-ups
• Specialist Consultations
• Vaccinations
• Emergency Care

Our team of experienced doctors is dedicated to providing the best care possible.

To book an appointment, type 'back' and select option 1.`;
    }
  } catch (error) {
    console.error('Error updating user state:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
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