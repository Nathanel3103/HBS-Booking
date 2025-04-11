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

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // In serverless environments, we need to check if the connection is still valid
  if (cachedClient && cachedDb) {
    try {
      // Verify the connection is still alive
      await cachedDb.command({ ping: 1 });
      return cachedDb;
    } catch (error) {
      // If ping fails, reset the connection
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    cachedClient = await MongoClient.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // Add these options for better serverless support
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      socketTimeoutMS: 30000,
      waitQueueTimeoutMS: 10000
    });
    cachedDb = cachedClient.db('hospital');
    return cachedDb;
  } catch (error) {
    cachedClient = null;
    cachedDb = null;
    throw error;
  }
}

export async function connectDB() {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await connectToDatabase();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

// Only close the connection if we're not in a serverless environment
export async function closeDB() {
  if (process.env.VERCEL) {
    return; // Don't close connections in serverless environment
  }

  try {
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
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
        await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).deleteOne({ sender: normalizedSender });
        userState = await createNewSession(sender, db);
        return getStepMessage(userState.step, userState);
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
        
        case WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION:
          response = await handleEmailSelection(message, normalizedSender, db);
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

async function handleEmailSelection(message, sender, db) {
  try {
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    const email = message.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_EMAIL;
    }

    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          'patientDetails.email': email,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.DATE_SELECTION,
          lastUpdated: new Date()
        }
      }
    );
    
    return "📅 Please enter your preferred date (DD/MM format):";
  } catch (error) {
    console.error('Email selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDateSelection(message, sender, db) {
  try {
    // Check database connection first
    if (!db || !db.collection) {
      throw new Error('Database connection not available');
    }

    if (!message.split('/').length === 3) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
    }

    const [d, m, y] = message.split('/');

    const newDateTime = new Date(y, m-1, d, 0, 0, 0, 0);

  

    // Validate date is today or in future
    const today = new Date();
    today.setHours(0,0,0,0);
    if (newDateTime.getTime() < today.getTime()) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_DATE_PAST;
    }

    // Update state
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          date: newDateTime,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.DOCTOR_SELECTION,
          lastUpdated: new Date()
        }
      }
    );

    return await getAvailableDoctorsResponse(db, message);
  } catch (error) {
    console.error('Date selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleTimeSelection(message, sender, db) {
  try {
    // Check database connection first
  
    // Get user state
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
   
    // Get available time slots for the selected date
    const availableSlots = await getAvailableTimeSlots(db, userState.date);

    if (availableSlots.length === 0) {
      // Find next 7 days with available doctors
      const availableDates = [];
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(userState.date);
        nextDate.setDate(nextDate.getDate() + i);
        const slots = await getAvailableTimeSlots(db, nextDate);
        if (slots.length > 0) {
          availableDates.push({
            date: nextDate,
            formattedDate: formatDate(nextDate)
          });
        }
      }

      if (availableDates.length > 0) {
        let message = `${WHATSAPP_CONFIG.CONVERSATION.NO_AVAILABILITY}\n\n`;
        message += `Here are available dates:\n`;
        message += availableDates.map(d => `- ${d.formattedDate}`).join('\n');
        message += `\n\nPlease reply with your preferred date (e.g. ${formatDate(new Date())})`;
        return message;
      } else {
        return WHATSAPP_CONFIG.ERRORS.NO_AVAILABILITY_EXTENDED;
      }
    }

    // Validate time slot format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(message)) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_TIME;
    }

    // Update state with selected time
    await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).updateOne(
      { sender },
      { 
        $set: { 
          time: message,
          step: WHATSAPP_CONFIG.CONVERSATION.STEPS.CONFIRMATION,
          lastUpdated: new Date()
        }
      }
    );

    return await getBookingConfirmationMessage(userState, message);
  } catch (error) {
    console.error('Time selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleDoctorSelection(message, sender, db) {
  try {
 
    const agg = [
      {
        '$match': {
          'workingHours': {
            '$elemMatch': {
              'day': '2025-04-18' //userState.date
            }
          }
        }
      }
    ];
   
    const coll = db.collection('doctors');
    const cursor = coll.aggregate([]);
    const doctors = await cursor.toArray();
    
    const selectedIndex = parseInt(message) - 1;
try{
  const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });

  // Insert the booking into the database
    db.collection('bookings').insertOne({
      patientName: userState?.name,
      patientEmail: userState?.email,
      appointmentDate: userState?.date,
      appointmentTime: '10:00',
      doctorId: doctors[selectedIndex]._id,
    });}catch{

    }


    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= doctors.length) {
    return WHATSAPP_CONFIG.ERRORS.INVALID_DOCTOR;
  }
   
    return `📅 Your appointment is scheduled with ${doctors[selectedIndex].name}.`;
  } catch (error) {
    console.error('Doctor selection error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

async function handleConfirmation(message, sender, db) {
  try {
    const normalizedInput = message.toLowerCase().trim();
    const userState = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.CHAT_STATES).findOne({ sender });
    
 

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
    case WHATSAPP_CONFIG.CONVERSATION.STEPS.EMAIL_SELECTION:
      return "📧 Please enter your email address:";
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
  const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  return false;
  // return (
  //   !userState ||
  //   !userState.lastUpdated ||
  //   Date.now() - new Date(userState.lastUpdated).getTime() > SESSION_TIMEOUT_MS
  // );
}

async function getAvailableDoctorsResponse(db, date) {
  try {
    // Parse input date
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return WHATSAPP_CONFIG.ERRORS.INVALID_DATE;
    }

    const agg = [
      {
        '$match': {
          'workingHours': {
            '$elemMatch': {
              'day': `2025-${selectedDate.getMonth()+1 > 9 ?selectedDate.getMonth()+1 :`0${selectedDate.getMonth()+1}` }-${selectedDate.getDate() > 9 ? selectedDate.getDate() : `0${selectedDate.getDate()}`}`,
            }
          }
        }
      }
    ];
   
    const coll = db.collection('doctors');
    const cursor = coll.aggregate(agg);
    const doctors = await cursor.toArray();
    console.dir(agg,{depth:Infinity});
    console.dir(doctors,{depth:Infinity});


    if (doctors.length === 0) {
      return WHATSAPP_CONFIG.ERRORS.NO_DOCTORS_AVAILABLE;
    }

    // Get available doctors for the selected date
    // const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS).aggregate([
    //   {
    //     '$match': {
    //       'workingHours': {
    //         '$elemMatch': {
    //           'day': '2025-04-18'
    //         }
    //       }
    //     }
    //   }
    // ])
    // .toArray();

    

    // Format response message
    let response = '👨‍⚕️ Available doctors:\n\n';
    doctors.forEach((doctor, index) => {
      response += `${index + 1}. ${doctor.name} - ${doctor.specialization}\n`;
    });
    response += '\nPlease reply with the number of your preferred doctor';
    
    return response;
  } catch (error) {
    console.error('Doctor availability error:', error);
    return WHATSAPP_CONFIG.ERRORS.SYSTEM_ERROR;
  }
}

export { 
  connectToDatabase
};