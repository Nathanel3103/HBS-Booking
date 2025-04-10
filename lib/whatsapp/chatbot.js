import { MongoClient } from 'mongodb';
import { WHATSAPP_CONFIG } from './config';
import {
  validateDate,
  formatDate,
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
  try {
    const db = await connectDB();
    try {
      let normalizedSender = sender.replace('whatsapp:', '');
      const normalizedMessage = message.toLowerCase().trim();

      console.log('Processing message:', {
        originalMessage: message,
        normalizedSender,
        timestamp: new Date().toISOString()
      });

      let userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ 
        sender: normalizedSender 
      });

      // Handle session expiration
      if (userState && isSessionExpired(userState)) {
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });
        userState = null; // Force new session
      }
      
      if (!userState || normalizedMessage === 'reset') {
        userState = await createNewSession(sender, db);
        return getStepMessage(userState.step, userState);
      }

      console.log('Initial user state:', userState);

      // Handle back option
      if (normalizedMessage === 'back') {
        return await handleBackOption(sender, db);
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
      console.error('Message handling error:', error);
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });
      return generateWelcomeMessage();
    } finally {
      await closeDB();
    }
  } catch (dbError) {
    console.error('Database connection error:', dbError);
    return generateWelcomeMessage();
  }
}

async function handleBackOption(sender, db) {
  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
    if (!userState) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    }

    // Define allowed back transitions
    const backTransitions = {
      [WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS,
      [WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION,
      [WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION,
      [WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION,
      [WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION]: WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION
    };

    const previousStep = backTransitions[userState.step];
    if (!previousStep) {
      return WHATSAPP_CONFIG.ERRORS.CANNOT_GO_BACK;
    }

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          step: previousStep,
          lastUpdated: new Date()
        },
        $unset: {
          ...(previousStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS && { 'patientDetails.email': '' }),
          ...(previousStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION && { date: '' }),
          ...(previousStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION && { time: '' }),
          ...(previousStep === WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION && { doctorId: '' })
        }
      }
    );

    return getStepMessage(previousStep, userState);
  } catch (error) {
    console.error('Back navigation error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleInitialSelection(message, sender, db) {
  try {
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
  } catch (error) {
    console.error('Initial selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handlePatientDetails(message, sender, db) {
  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
    if (!userState) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    }

    // Handle name input
    if (!userState.patientDetails.name) {
      if (!validateName(message)) {
        return WHATSAPP_CONFIG.ERRORS.INVALID_NAME;
      }

      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        { 
          $set: { 
            'patientDetails.name': message.trim(),
            lastUpdated: new Date()
          }
        }
      );
      return "📱 Please enter your phone number:";
    }
    
    // Handle phone input
    if (!userState.patientDetails.phone) {
      if (!validatePhone(message)) {
        return WHATSAPP_CONFIG.ERRORS.INVALID_PHONE;
      }
      
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        { 
          $set: { 
            'patientDetails.phone': message.trim(),
            step: WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION,
            lastUpdated: new Date()
          }
        }
      );
      return "📧 Please enter your email address:";
    }
    
    // Handle email input
    if (!userState.patientDetails.email) {
      if (!validateEmail(message)) {
        return WHATSAPP_CONFIG.ERRORS.INVALID_EMAIL;
      }

      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        { 
          $set: { 
            'patientDetails.email': message.trim(),
            step: WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION,
            lastUpdated: new Date()
          }
        }
      );
      
      // Verify transition
      const updatedState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES)
        .findOne({ sender });
      
      if (!updatedState || updatedState.step !== WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION) {
        console.error('Transition failed - resetting session');
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });
        return generateWelcomeMessage();
      }
      
      return "📅 Please enter your preferred date (DD/MM format):";
    }
    
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  } catch (error) {
    console.error('Patient details error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDateSelection(message, sender, db) {
  try {
  if (!validateDate(message)) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
  }

  const [_, day, month] = message.match(/^(\d{2})\/(\d{2})$/);
  const selectedDate = new Date(new Date().getFullYear(), month - 1, day);

    // Validate date is today or in future
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selectedDate < today) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_DATE_PAST;
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { 
      $set: { 
        date: selectedDate,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION,
          lastUpdated: new Date()
        }
      }
    );
    
    return "⏰ Please select a time slot:" + formatTimeSlotsMessage(await getAvailableTimeSlots(selectedDate));
  } catch (error) {
    console.error('Date selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleTimeSelection(message, sender, db) {
  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
    // Validate session and date
    if (!userState?.date) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    }
    
    // Get current available slots
    const availableSlots = await getAvailableTimeSlots(userState.date);
    if (availableSlots.length === 0) {
      return WHATSAPP_CONFIG.ERRORS.NO_SLOTS_AVAILABLE;
    }
    
    // Validate selection
    const selectedIndex = parseInt(message) - 1;
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= availableSlots.length) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_SLOT_SELECTION;
    }
    
    // Verify slot still available
    const selectedSlot = availableSlots[selectedIndex];
    const slotBookings = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).countDocuments({
      date: userState.date,
      time: selectedSlot
    });
    
    if (slotBookings >= WHATSAPP_CONFIG.MAX_BOOKINGS_PER_SLOT) {
      return WHATSAPP_CONFIG.ERRORS.SLOT_FULL;
    }

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          time: selectedSlot,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION,
          lastUpdated: new Date()
        }
      }
    );
    
    return "👨‍⚕️ Available doctors:\n" + formatDoctorListMessage(await getAvailableDoctors(userState.date, selectedSlot));
  } catch (error) {
    console.error('Time selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDoctorSelection(message, sender, db) {
  try {
  const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    if (!userState?.date || !userState?.time) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    }

    // Verify time slot still available
    const timeSlots = await getAvailableTimeSlots(userState.date);
    if (!timeSlots.includes(userState.time)) {
      return WHATSAPP_CONFIG.ERRORS.TIME_SLOT_TAKEN;
    }

    const doctors = await getAvailableDoctors(userState.date, userState.time);
    if (doctors.length === 0) {
      return WHATSAPP_CONFIG.ERRORS.NO_DOCTORS_AVAILABLE;
    }

  const selectedIndex = parseInt(message) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= doctors.length) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_DOCTOR;
  }

  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
    { sender },
    { 
      $set: { 
          doctorId: doctors[selectedIndex]._id,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION,
          lastUpdated: new Date()
        }
      }
    );
    
    return generateConfirmationMessage(userState, doctors[selectedIndex]);
  } catch (error) {
    console.error('Doctor selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleConfirmation(message, sender, db) {
  try {
    const normalizedInput = message.toLowerCase().trim();
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
    if (!userState) {
      return WHATSAPP_CONFIG.ERRORS.SESSION_EXPIRED;
    }

    // Check for existing appointment
    const existingAppt = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).findOne({
      'patientDetails.phone': userState.patientDetails.phone,
      date: userState.date,
      time: userState.time
    });
    
    if (existingAppt) {
      return WHATSAPP_CONFIG.ERRORS.APPOINTMENT_CONFLICT;
    }

    if (normalizedInput === 'yes') {
      const doctor = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS).findOne({ 
        _id: userState.doctorId 
      });
      
      if (!doctor) {
        return WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE;
      }

      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS).insertOne({
        patientDetails: userState.patientDetails,
        date: userState.date,
        time: userState.time,
        doctor: {
          _id: doctor._id,
          name: doctor.name,
          specialty: doctor.specialty
        },
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });

      return `✅ Appointment confirmed!
📅 Date: ${formatDate(userState.date)}
⏰ Time: ${userState.time}
👨‍⚕️ Doctor: ${doctor.name}
📍 Location: ${WHATSAPP_CONFIG.HOSPITAL_ADDRESS}

We'll send you a reminder before your appointment.`;
    } 
    else if (normalizedInput === 'no') {
      await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
        { sender },
        { 
          $set: { 
            step: WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION,
            lastUpdated: new Date()
          }
        }
      );
      return "Please select a different time:" + formatTimeSlotsMessage(await getAvailableTimeSlots(userState.date));
    }
    
    return "Please reply with 'yes' to confirm or 'no' to choose a different time.";
  } catch (error) {
    console.error('Confirmation error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleLearnAboutUs(message, sender, db) {
  try {
    return `🏥 ${WHATSAPP_CONFIG.HOSPITAL_NAME}
    
We are a leading healthcare provider with:
- 24/7 Emergency Services
- Specialized Departments
- Experienced Medical Staff
- State-of-the-art Facilities

To book an appointment, type 'back' and select option 1.`;
  } catch (error) {
    console.error('Learn about us error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function getStepMessage(step, userState) {
  switch(step) {
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL:
      return generateWelcomeMessage();
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.PATIENT_DETAILS:
      if (!userState.patientDetails.name) {
        return "👤 Please enter your full name:";
      } else if (!userState.patientDetails.phone) {
        return "📱 Please enter your phone number:";
      } else {
        return "📧 Please enter your email address:";
      }
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION:
      return "📅 Please enter your preferred date (DD/MM format):";
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.TIME_SELECTION:
      return "⏰ Please select a time slot:" + formatTimeSlotsMessage(await getAvailableTimeSlots(userState.date));
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION:
      return "👨‍⚕️ Available doctors:\n" + formatDoctorListMessage(await getAvailableDoctors(userState.date, userState.time));
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION:
      return generateConfirmationMessage(userState);
    default:
      return generateWelcomeMessage();
  }
}

async function createNewSession(sender, db) {
  const newState = {
    sender: sender,
    step: WHATSAPP_CONFIG.CONVERSATION.STEPS.INITIAL,
    createdAt: new Date(),
    lastUpdated: new Date(),
    patientDetails: {},
    attempts: 0
  };
  
  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender });
  await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).insertOne(newState);
  return newState;
}

function isSessionExpired(userState) {
  const timeoutMs = WHATSAPP_CONFIG.CONVERSATION.SESSION_TIMEOUT_MINUTES * 60 * 1000;
  return Date.now() - new Date(userState.lastUpdated).getTime() > timeoutMs;
}