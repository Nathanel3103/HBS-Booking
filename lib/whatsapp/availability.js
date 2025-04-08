import { WHATSAPP_CONFIG } from './config';

export async function getAvailableTimeSlots(db, date) {
  try {
    const day = date.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Get all schedules for this day of week
    const schedules = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.SCHEDULES)
      .find({ dayOfWeek: day, type: "scheduled" })
      .toArray();

    // Flatten the slots
    const allSlots = schedules.flatMap(schedule => schedule.slots);

    // Get all appointments for this date
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({ 
        date: { 
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        status: "confirmed"
      })
      .toArray();

    // Create set of booked times
    const bookedTimes = new Set(appointments.map(appt => appt.time));

    // Filter available slots
    return allSlots.filter(slot => !bookedTimes.has(slot.time));
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
}

export async function getAvailableDoctors(db, service, date, time) {
  try {
    // Get doctors who specialize in this service and are available at this time
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({ 
        specialties: service,
        schedules: {
          $elemMatch: {
            dayOfWeek: date.getDay(),
            "slots.time": time
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

    const bookedDoctorIds = new Set(appointments.map(appt => appt.doctor._id.toString()));

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