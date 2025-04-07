import { WHATSAPP_CONFIG } from './config';

export function validateDate(dateStr) {
  if (!dateStr) {
    throw new Error('Please enter a date in DD/MM format (e.g., 15/04).');
  }

  // Remove any whitespace and convert to lowercase
  dateStr = dateStr.toString().trim().toLowerCase();

  // Handle common variations
  if (dateStr === 'today') {
    return true; // Will use current date
  }
  if (dateStr === 'tomorrow') {
    return true; // Will use tomorrow's date
  }

  // Check basic format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) {
    throw new Error('Please use DD/MM format (e.g., 15/04). Use forward slashes (/) to separate day and month.');
  }

  let [_, day, month] = match.map(Number);

  // Pad single digits with leading zeros
  day = day.toString().padStart(2, '0');
  month = month.toString().padStart(2, '0');

  // Validate month range
  if (month < 1 || month > 12) {
    throw new Error('Please enter a valid month (01-12).');
  }

  // Validate days in month
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, month, 0).getDate();
  
  if (day < 1 || day > daysInMonth) {
    throw new Error(`Please enter a valid day (01-${daysInMonth.toString().padStart(2, '0')}) for the selected month.`);
  }

  const selectedDate = new Date(currentYear, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Don't allow dates more than 3 months in the future
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  maxDate.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    throw new Error('Please select a future date. You cannot book appointments in the past.');
  }

  if (selectedDate > maxDate) {
    throw new Error('Please select a date within the next 3 months.');
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
