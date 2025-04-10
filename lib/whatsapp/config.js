// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'MONGODB_URI',
  'WEBHOOK_URL'
];

function validateEnvVars() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Validate environment variables at startup
validateEnvVars();

export const WHATSAPP_CONFIG = {
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER,

  // Hospital Information
  HOSPITAL_NAME: "Hospital Booking System",
  HOSPITAL_ADDRESS: "Harare Institute of Technology",
  MAX_BOOKINGS_PER_SLOT: 2, // Maximum patients per time slot

  // MongoDB Collections
  COLLECTIONS: {
    CHAT_STATES: "chat_states",
    APPOINTMENTS: "appointments",
    DOCTORS: "doctors"
  },

  // Conversation Flow Settings
  CONVERSATION: {
    STEPS: {
      INITIAL: "initial",
      PATIENT_DETAILS: "patient_details",
      EMAIL_SELECTION: "email_selection",
      DATE_SELECTION: "date_selection",
      TIME_SELECTION: "time_selection",
      DOCTOR_SELECTION: "doctor_selection",
      CONFIRMATION: "confirmation",
      LEARN_ABOUT_US: "learn_about_us"
    },
    INITIAL_OPTIONS: {
      '1': 'Book Appointment',
      '2': 'Learn About Us'
    },
    SESSION_TIMEOUT_MINUTES: 30
  },

  // Error Messages
  ERRORS: {
    SYSTEM_ERROR: "⚠️ I encountered an error, please try again later",
    SESSION_EXPIRED: "⌛ Your session expired, starting over...",
    INVALID_NAME: "❌ Please enter a valid full name",
    INVALID_PHONE: "❌ Please enter a valid phone number",
    INVALID_EMAIL: "❌ Please enter a valid email address",
    INVALID_DATE: "❌ Please enter date in DD/MM format",
    INVALID_DATE_PAST: "❌ Please select today's date or a future date",
    INVALID_SLOT_SELECTION: "❌ Please select a valid time slot",
    INVALID_DOCTOR: "❌ Please select a valid doctor",
    UNKNOWN_STEP: "⚠️ Unknown conversation step, resetting...",
    NO_SLOTS_AVAILABLE: "⚠️ No time slots available for this date",
    SLOT_FULL: "⚠️ This slot just became unavailable, please choose another",
    TIME_SLOT_TAKEN: "⚠️ This time slot was just taken, please select another",
    NO_DOCTORS_AVAILABLE: "⚠️ No doctors available for this time slot",
    NO_AVAILABILITY: "⚠️ No availability on selected date",
    NO_AVAILABILITY_EXTENDED: "⚠️ No availability found in the next 7 days",
    APPOINTMENT_CONFLICT: "⚠️ You already have an appointment at this time",
    DOCTOR_UNAVAILABLE: "⚠️ The selected doctor is no longer available"
  },

  // Available Time Slots
  AVAILABLE_TIMES: [
    "09:00 AM", "10:00 AM", "11:00 AM",
    "02:00 PM", "03:00 PM", "04:00 PM"
  ]
};