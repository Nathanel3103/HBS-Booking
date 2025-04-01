import { WHATSAPP_CONFIG } from './config';

export async function getAvailableTimeSlots(db, date) {
  try {
    // Ensure date is a valid Date object
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    // Check if the date is in the past
    const now = new Date();
    if (selectedDate < now) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.SLOT_EXPIRED);
    }

    // Normalize date range for querying
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

    // Get confirmed appointments for the selected date
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({
        date: { $gte: startOfDay, $lt: endOfDay },
        status: 'confirmed'
      })
      .toArray();

    // Get all available schedules
    const schedules = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.SCHEDULES)
      .find({})
      .toArray();

    // Extract booked time slots
    const bookedSlots = new Set(appointments.map(apt => apt.time));

    // Filter out booked slots and return available ones
    const availableSlots = schedules
      .filter(schedule => !bookedSlots.has(schedule.time))
      .map(schedule => schedule.time)
      .sort();

    if (availableSlots.length === 0) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_SLOTS);
    }

    return availableSlots;
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    throw error;
  }
}

export async function getAvailableDoctors(db, service, date, time) {
  try {
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    // Check if the date is in the past
    const now = new Date();
    if (selectedDate < now) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.SLOT_EXPIRED);
    }

    // Get active doctors offering the selected service
    const doctors = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.DOCTORS)
      .find({ specialties: service, isActive: true })
      .toArray();

    if (!doctors.length) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS);
    }

    // Get scheduled doctors for the selected date and time
    const schedules = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.SCHEDULES)
      .find({
        doctorId: { $in: doctors.map(d => d._id) },
        date: { $gte: selectedDate.setHours(0, 0, 0, 0), $lt: selectedDate.setHours(23, 59, 59, 999) },
        time
      })
      .toArray();

    // Get confirmed appointments for the same time slot
    const appointments = await db.collection(WHATSAPP_CONFIG.COLLECTIONS.APPOINTMENTS)
      .find({
        date: { $gte: selectedDate.setHours(0, 0, 0, 0), $lt: selectedDate.setHours(23, 59, 59, 999) },
        time,
        status: 'confirmed'
      })
      .toArray();

    const bookedDoctorIds = new Set(appointments.map(apt => apt.doctor._id));

    // Filter available doctors
    const availableDoctors = doctors.filter(doctor =>
      !bookedDoctorIds.has(doctor._id) &&
      schedules.some(schedule => schedule.doctorId.equals(doctor._id))
    );

    if (availableDoctors.length === 0) {
      throw new Error(WHATSAPP_CONFIG.ERRORS.DOCTOR_UNAVAILABLE);
    }

    return availableDoctors;
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    throw error;
  }
}

export function formatTimeSlotsMessage(slots) {
  if (!slots.length) return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_SLOTS;
  return `Available time slots:\n\n` + slots.map((time, index) => `${index + 1}. ${time}`).join('\n') + `\n\nPlease select a time slot (1-${slots.length}):`;
}

export function formatDoctorListMessage(doctors) {
  if (!doctors.length) return WHATSAPP_CONFIG.ERRORS.NO_AVAILABLE_DOCTORS;
  return `Available doctors:\n\n` + doctors.map((d, i) => `${i + 1}. ${d.name} (${d.specialty})`).join('\n') + `\n\nPlease select a doctor (1-${doctors.length}):`;
}
