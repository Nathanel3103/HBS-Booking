import { WHATSAPP_CONFIG } from './config';

export function validateDate(input) {
  try {
    const cleanedInput = input.toLowerCase().trim();
    
    // Handle special keywords
    if (cleanedInput === 'today' || cleanedInput === 'tomorrow') {
      return true;
    }

    // Handle DD/MM format
    const dateRegex = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;
    const match = cleanedInput.match(dateRegex);
    
    if (!match) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.INVALID_DATE);
    }

    const [_, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();

    // Basic date validation
    if (monthNum < 1 || monthNum > 12) {
      throw new Error('Invalid month. Month should be between 1 and 12.');
    }

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    if (dayNum < 1 || dayNum > daysInMonth) {
      throw new Error(`Invalid day. Day should be between 1 and ${daysInMonth} for month ${monthNum}.`);
    }

    // Don't allow past dates
    const currentDate = new Date();
    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
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
  } catch (error) {
    console.error('Date validation error:', error);
    throw error;
  }
}

export function formatDate(date) {
  if (!(date instanceof Date)) {
    return 'Invalid date';
  }
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

  const now = Date.now();
  const lastUpdated = new Date(userState.lastUpdated).getTime();
  
  return (now - lastUpdated) > WHATSAPP_CONFIG.CONVERSATION.SESSION_TIMEOUT;
}

export function generateConfirmationMessage(appointment) {
  return `✅ Appointment confirmed!\n\n` +
         `🏥 Service: ${appointment.service}\n` +
         `📅 Date: ${formatDate(appointment.date)}\n` +
         `⏰ Time: ${appointment.time}\n` +
         `👨‍⚕️ Doctor: ${appointment.doctor.name}\n\n` +
         `Thank you for choosing our healthcare service!`;
}

export function generateWelcomeMessage() {
  return `👋 Welcome to Healthcare Booking System!\n\n` +
         `🏥 Please select a service:\n\n` +
         Object.entries(WHATSAPP_CONFIG.CONVERSATION.SERVICES)
           .map(([key, value]) => `${key}. ${value}`)
           .join('\n') +
         `\n\nReply with the number of your choice.`;
}

export function sanitizeInput(input) {
  if (!input) return '';
  
  return input
    .toString()
    .trim()
    .replace(/[<>"'`]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length
}