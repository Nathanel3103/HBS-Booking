import { WHATSAPP_CONFIG } from './config';

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
