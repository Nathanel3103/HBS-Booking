// config.js

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER'
];

function validateEnvVars() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate environment variables at startup
validateEnvVars();

export const WHATSAPP_CONFIG = {
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,

  // MongoDB Collections
  COLLECTIONS: {
    CHAT_STATES: 'chat_states',
    APPOINTMENTS: 'appointments',
    DOCTORS: 'doctors',
    SCHEDULES: 'schedules'
  },

  // Conversation Flow Settings
  CONVERSATION: {
    MAX_RETRIES: 3,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    SERVICES: {
      '1': 'General Check-up',
      '2': 'Specialist Visit',
      '3': 'Vaccination',
      '4': 'Emergency Care'
    }
  },

  // Error Messages
  ERRORS: {
    INVALID_DATE: '❌ Invalid date format. Please use DD/MM format (e.g., 15/04).',
    INVALID_TIME: '❌ Invalid time selection. Please choose from available slots.',
    INVALID_SERVICE: '❌ Invalid service selection. Please choose a number between 1 and 4.',
    INVALID_DOCTOR: '❌ Invalid doctor selection. Please choose from available doctors.',
    SESSION_EXPIRED: '⏰ Your session has expired. Please start over by sending any message.',
    SYSTEM_ERROR: '⚠️ Sorry, I encountered an error. Please try again later.',
    NO_AVAILABLE_SLOTS: '📅 Sorry, no available slots for the selected date. Please choose another date.',
    NO_AVAILABLE_DOCTORS: '👨‍⚕️ Sorry, no doctors available for the selected service and time. Please try another time slot.',
    RATE_LIMIT: '⏳ Too many requests. Please try again later.',
    MISSING_FIELDS: '❓ Missing required information. Please try again.',
    DB_ERROR: '🔧 Database connection error. Please try again later.',
    SLOT_BOOKED: '⏰ Sorry, this time slot has just been booked by someone else. Please select another time.',
    DOCTOR_UNAVAILABLE: '👨‍⚕️ Sorry, the selected doctor is no longer available for this time slot. Please choose another doctor.',
    SLOT_EXPIRED: '⏰ Sorry, the selected time slot has expired. Please select a new time slot.',
    BOOKING_FAILED: '❌ Sorry, we couldn\'t complete your booking. The slot might have been taken. Please try again.',
    INVALID_SLOT_SELECTION: '❌ Please select a valid time slot number from the list provided.'
  }
};
