import { WHATSAPP_CONFIG } from './config';

export async function getAvailableTimeSlots(db, date) {
  try {
    const day = date.getDay(); // 0 (Sunday) to 6 (Saturday)
    const dayName = getWeekdayName(day);
    
    // Get doctors with working hours for this day
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({
        workingHours: {
          $elemMatch: {
            day: dayName
          }
        }
      })
      .toArray();
    
    // Create time slots based on doctors' working hours
    const defaultSlots = [];
    doctors.forEach(doctor => {
      const workingHours = doctor.workingHours.find(wh => wh.day === dayName);
      if (workingHours) {
        const { startTime, endTime } = workingHours;
        // Add standard time slots every hour
        const slots = generateTimeSlots(startTime, endTime);
        defaultSlots.push(...slots.map(time => ({ 
          time,
          doctor: doctor._id 
        })));
      }
    });
    
    if (defaultSlots.length === 0) {
      console.log("No working hours found for day:", dayName);
      return [];
    }

    // Get all appointments for this date
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({ 
        date: { 
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        },
        status: "confirmed"
      })
      .toArray();

    // Create set of booked times
    const bookedTimes = new Set(appointments.map(appt => appt.time));

    // Filter available slots
    return defaultSlots.filter(slot => !bookedTimes.has(slot.time));
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
}

// Helper function to get day name from day number
function getWeekdayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
}

// Helper function to generate hourly time slots between start and end time
function generateTimeSlots(startTime, endTime) {
  // Parse times to standardized format if needed
  const parseTime = (timeStr) => {
    if (timeStr.includes(':')) return timeStr;
    // Add more parsing logic if needed
    return timeStr;
  };
  
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  // Default to WHATSAPP_CONFIG times if parsing fails
  return WHATSAPP_CONFIG.CONVERSATION.AVAILABLE_TIMES;
}

export async function getAvailableDoctors(db, service, date, time) {
  try {
    const dayName = getWeekdayName(date.getDay());
    
    // Get doctors who specialize in this service and are available at this time
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({ 
        specialization: service,
        workingHours: {
          $elemMatch: {
            day: dayName,
            startTime: { $lte: time },
            endTime: { $gte: time }
          }
        }
      })
      .toArray();

    if (!doctors || doctors.length === 0) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS);
    }

    // Check if any of these doctors have existing appointments at this time
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({
        date: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        time: time,
        status: "confirmed"
      })
      .toArray();

    const bookedDoctorIds = new Set(appointments.map(appt => appt.doctorId.toString()));

    return doctors.filter(doctor => !bookedDoctorIds.has(doctor._id.toString()));
  } catch (error) {
    console.error('Error getting available doctors:', error);
    throw error;
  }
}

export function formatTimeSlotsMessage(slots) {
  if (!slots || slots.length === 0) {
    return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_SLOTS;
  }
  
  return '⏰ Available time slots:\n\n' +
         slots.map((slot, index) => `${index + 1}. ${slot.time}`).join('\n') +
         `\n\nPlease select a time slot (1-${slots.length}):`;
}

export function formatDoctorListMessage(doctors) {
  if (!doctors || doctors.length === 0) {
    return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS;
  }
  
  return '👨‍⚕️ Available doctors:\n\n' +
         doctors.map((doctor, index) => `${index + 1}. Dr. ${doctor.name} (${doctor.specialty})`).join('\n') +
         `\n\nPlease select a doctor (1-${doctors.length}):`;
}