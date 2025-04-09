import { WHATSAPP_CONFIG } from './config';

// Sanitize input to prevent security issues
export function sanitizeInput(input) {
  if (!input) return '';
  
  // Convert to string if it's not already
  const str = String(input);
  
  // Remove any potentially harmful characters
  return str
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/(\r\n|\r|\n)/g, ' ') // Replace newlines with spaces
    .trim();
}

export function validateDate(dateStr) {
  const dateRegex = /^(\d{2})\/(\d{2})$/;
  const match = dateStr.match(dateRegex);
  if (!match) return false;

  const [_, day, month] = match.map(Number);
  const currentYear = new Date().getFullYear();
  const selectedDate = new Date(currentYear, month - 1, day);

  // Check if the day and month are valid
  if (selectedDate.getDate() !== day || selectedDate.getMonth() !== month - 1) {
    return false;
  }

  return selectedDate >= new Date().setHours(0, 0, 0, 0); // Compare only the date part
}

export function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function isSessionExpired(chatState) {
  if (!chatState?.createdAt) return true;
  
  const sessionAge = Date.now() - new Date(chatState.createdAt).getTime();
  return sessionAge > WHATSAPP_CONFIG.CONVERSATION.SESSION_TIMEOUT;
}

export function generateDoctorList(doctors = []) {
  if (!doctors.length) return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS;
  
  return doctors
    .map((d, i) => `${i + 1}. ${d.name} (${d.specialty})`)
    .join('\n');
}

export function validateName(name) {
  // Name should be at least 2 characters and contain only letters and spaces
  return /^[a-zA-Z\s]{2,}$/.test(name);
}

export function validatePhone(phone) {
  // Phone number should be 10-15 digits, may include +, -, spaces
  return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);
}

export function validateEmail(email) {
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateWelcomeMessage() {
  return `👋 Welcome to Hospital Booking System!

Please select an option:
1. Book Appointment
2. Learn About Us

Type 'back' at any time to go to the previous step.`;
}

export function generateConfirmationMessage(userState) {
  return `📋 Please confirm your appointment details:

👤 Name: ${userState.patientDetails.name}
📱 Phone: ${userState.patientDetails.phone}
📧 Email: ${userState.patientDetails.email}
📅 Date: ${formatDate(userState.date)}
⏰ Time: ${userState.time}
👨‍⚕️ Doctor: Dr. ${userState.selectedDoctor.name}

Reply with 'yes' to confirm or 'no' to choose a different time slot.`;
}

export function generateTimeSlotsMessage() {
  const availableTimes = WHATSAPP_CONFIG.CONVERSATION.AVAILABLE_TIMES || [];
  
  if (availableTimes.length === 0) {
    return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_SLOTS;
  }

  return 'Available time slots:\n\n' +
         availableTimes.map((time, index) => `${index + 1}. ${time}`).join('\n') +
         `\n\nPlease select a time slot (1-${availableTimes.length}):`;
}
