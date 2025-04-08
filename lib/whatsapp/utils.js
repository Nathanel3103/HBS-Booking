import { WHATSAPP_CONFIG } from './config';

export function validateDate(input) {
  const cleanedInput = input.toLowerCase().trim();
  
  // Handle special keywords
  if (cleanedInput === 'today' || cleanedInput === 'tomorrow') {
    return true;
  }

  // Handle DD/MM format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})$/;
  const match = cleanedInput.match(dateRegex);
  
  if (!match) {
    throw new Error('Invalid date format. Please use DD/MM or "today"/"tomorrow".');
  }

  const [_, day, month] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);

  // Basic date validation
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month. Month should be between 1 and 12.');
  }

  const daysInMonth = new Date(new Date().getFullYear(), monthNum, 0).getDate();
  if (dayNum < 1 || dayNum > daysInMonth) {
    throw new Error(`Invalid day. Day should be between 1 and ${daysInMonth} for month ${monthNum}.`);
  }

  // Don't allow past dates
  const currentDate = new Date();
  const inputDate = new Date(currentDate.getFullYear(), monthNum - 1, dayNum);
  if (inputDate < new Date(currentDate.setHours(0, 0, 0, 0))) {
    throw new Error('Cannot book appointments for past dates.');
  }

  // Don't allow dates too far in the future (e.g., 3 months)
  const maxFutureDate = new Date();
  maxFutureDate.setMonth(maxFutureDate.getMonth() + 3);
  if (inputDate > maxFutureDate) {
    throw new Error('Cannot book appointments more than 3 months in advance.');
  }

  return true;
}

export function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function isSessionExpired(userState) {
  if (!userState || !userState.lastUpdated) {
    return true;
  }

  const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  const now = Date.now();
  const lastUpdated = new Date(userState.lastUpdated).getTime();
  
  return (now - lastUpdated) > SESSION_TIMEOUT;
}

export function generateDoctorList(doctors = []) {
  if (!doctors.length) return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS;
  
  return doctors
    .map((d, i) => `${i + 1}. ${d.name} (${d.specialty})`)
    .join('\n');
}

export function generateConfirmationMessage(appointment) {
  return `✅ Appointment confirmed!\n\n` +
         `🏥 Service: ${appointment.service}\n` +
         `📅 Date: ${formatDate(appointment.date)}\n` +
         `⏰ Time: ${appointment.time}\n` +
         `👨‍⚕️ Doctor: ${appointment.doctor.name}\n\n` +
         `Thank you for choosing our healthcare service! 🙏`;
}

export function generateWelcomeMessage() {
  return `👋 Welcome to Healthcare Booking System!\n\n` +
         `🏥 Please select a service:\n\n` +
         Object.entries(WHATSAPP_CONFIG.CONVERSATION.SERVICES)
           .map(([key, value]) => `${key}. ${value}`)
           .join('\n') +
         `\n\nReply with the number of your choice.`;
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

export function sanitizeInput(input) {
  if (!input) return '';
  
  // Remove any potential XSS/injection content
  return input
    .toString()
    .trim()
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}
