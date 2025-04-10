import { WHATSAPP_CONFIG } from './config';

export async function getAvailableTimeSlots(db, date) {
  try {
    const dayName = getWeekdayName(date.getDay());
    
    // Optimized MongoDB Atlas query
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({
        "workingHours.day": dayName
      })
      .project({
        workingHours: { $elemMatch: { day: dayName } },
        _id: 1
      })
      .maxTimeMS(5000)
      .toArray();

    if (!Array.isArray(doctors)) {
      throw new Error('Invalid doctors array response');
    }

    const defaultSlots = [];
    doctors.forEach(doctor => {
      const workingHours = doctor.workingHours?.find(wh => wh.day === dayName);
      if (workingHours?.startTime && workingHours?.endTime) {
        const slots = generateTimeSlots(workingHours.startTime, workingHours.endTime);
        defaultSlots.push(...slots.map(time => ({
          time,
          doctor: doctor._id
        })));
      }
    });

    if (defaultSlots.length === 0) {
      console.warn('No working hours found for day:', dayName);
      return [];
    }

    // Optimized appointments query
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({
        date: {
          $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
        },
        time: { $in: defaultSlots.map(slot => slot.time) },
        status: "confirmed"
      })
      .project({ time: 1 })
      .maxTimeMS(5000)
      .toArray();

    const bookedTimes = new Set(appointments.map(appt => appt.time));
    return defaultSlots.filter(slot => !bookedTimes.has(slot.time));
  } catch (error) {
    console.error('MongoDB Atlas availability error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw new Error(WHATSAPP_CONFIG.ERRORS.AVAILABILITY_ERROR);
  }
}

// Helper functions with improved validation
function getWeekdayName(dayNumber) {
  if (dayNumber < 0 || dayNumber > 6) {
    console.warn('Invalid day number:', dayNumber);
    return 'Sunday';
  }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
}

function generateTimeSlots(startTime, endTime) {
  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
    if (timeStr.match(/^\d{1,2}([ap]m)?$/i)) {
      // Handle simple time formats
      return convertSimpleTime(timeStr);
    }
    return null;
  };

  const start = parseTime(startTime) || WHATSAPP_CONFIG.DEFAULT_START_TIME;
  const end = parseTime(endTime) || WHATSAPP_CONFIG.DEFAULT_END_TIME;

  if (!start || !end) {
    console.warn('Invalid time format:', { startTime, endTime });
    return WHATSAPP_CONFIG.CONVERSATION.AVAILABLE_TIMES;
  }

  return generateSlotsBetween(start, end);
}

// Helper function to convert simple time format to 24-hour format
function convertSimpleTime(timeStr) {
  const match = timeStr.match(/^(\d{1,2})([ap]m)?$/i);
  if (!match) return null;
  
  let [_, hour, period] = match;
  hour = parseInt(hour);
  
  if (period) {
    period = period.toLowerCase();
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:00`;
}

// Helper function to generate slots between start and end time
function generateSlotsBetween(start, end) {
  const slots = [];
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`);
    
    currentMin += 30;
    if (currentMin >= 60) {
      currentHour++;
      currentMin = 0;
    }
  }
  
  return slots;
}

export async function getAvailableDoctors(db, service, date, time) {
  // Input validation
  if (!db || !service || !date || !time) {
    throw new Error('Missing required parameters');
  }
  if (!(date instanceof Date)) {
    throw new Error('Invalid date parameter');
  }

  try {
    const dayName = getWeekdayName(date.getDay());
    
    // Optimized MongoDB Atlas query
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({ 
        specialization: service,
        "workingHours.day": dayName,
        "workingHours.startTime": { $lte: time },
        "workingHours.endTime": { $gte: time }
      })
      .project({
        name: 1,
        specialty: 1,
        _id: 1,
        workingHours: { $elemMatch: { 
          day: dayName,
          startTime: { $lte: time },
          endTime: { $gte: time }
        }}
      })
      .maxTimeMS(5000)
      .toArray();

    if (!Array.isArray(doctors)) {
      throw new Error('Invalid doctors array response');
    }

    if (doctors.length === 0) {
      console.warn('No doctors available for:', { service, dayName, time });
      throw new Error(WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS);
    }

    // Optimized appointments query
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({
        date: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        time: time,
        status: "confirmed",
        doctorId: { $in: doctors.map(d => d._id) }
      })
      .project({ doctorId: 1 })
      .maxTimeMS(5000)
      .toArray();

    const bookedDoctorIds = new Set(
      appointments.map(appt => appt.doctorId.toString())
    );

    return doctors.filter(doctor => 
      !bookedDoctorIds.has(doctor._id.toString())
    );
  } catch (error) {
    console.error('MongoDB Atlas doctors availability error:', {
      error: error.message,
      service,
      date,
      time,
      timestamp: new Date().toISOString()
    });
    
    if (error.message === WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS) {
      throw error; // Preserve original error
    }
    throw new Error(WHATSAPP_CONFIG.ERRORS.DOCTORS_QUERY_ERROR);
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