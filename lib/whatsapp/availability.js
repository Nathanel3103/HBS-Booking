import { connectToDatabase } from "../mongodb";
import Schedule from "../../models/Schedule";
import Appointments from "../../models/Appointments";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { doctorId, day } = req.query;

  if (!doctorId || !day) {
    return res.status(400).json({ message: "Missing required query parameters" });
  }

  try {
    await connectToDatabase();

    // Fetch only scheduled type slots for the doctor on a given day
    const schedules = await Schedule.find({
      doctor: doctorId,
      day: day,
      type: "scheduled",
    });

    // Flatten the nested slots arrays into a single array
    const allScheduledSlots = schedules.flatMap(schedule => schedule.slots);

    // Fetch all confirmed appointments for the doctor on that day
    const appointments = await Appointments.find({
      doctor: doctorId,
      day: day,
      status: "confirmed",
    });

    // Create a Set of booked times for O(1) lookups
    const bookedTimes = new Set(appointments.map(appointment => appointment.time));

    // Filter out booked times from the scheduled slots
    const availableSlots = allScheduledSlots.filter(slot => !bookedTimes.has(slot.time));

    return res.status(200).json({ availableSlots });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
