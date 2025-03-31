import dbConnect from "../../lib/mongodb";
import Booking from "../../models/Booking";
import Doctor from "../../models/Doctors"; // Import the Doctor model
import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
          return res.status(400).json({ error: "Doctor ID and Date are required" });
      }

      // Fetch only the bookings for the selected doctor and date
      const bookings = await Booking.find({ doctor: doctorId, date }).select("time");

      return res.status(200).json({ success: true, bookings });
  } catch (error) {
      console.error("Error fetching booked slots:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch booked slots" });
  }
  } else if (req.method === "POST") { 
    
    const { userId, appointmentType, doctor, date, time, description, nextOfKin } = req.body;

    try {
        // Find the doctor
        const doctorRecord = await Doctor.findById(doctor);
        if (!doctorRecord) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Check if the selected time is already booked for the selected date
        const isAlreadyBooked = doctorRecord.appointmentsBooked.some(
            (appointment) => appointment.date === date && appointment.time === time
        );

        if (isAlreadyBooked) {
            return res.status(400).json({ message: "Time slot already booked" });
        }

        // Add the new appointment to appointmentsBooked (DO NOT REMOVE FROM availableSlots)
        doctorRecord.appointmentsBooked.push({ patientId: userId, date, time });
        await doctorRecord.save();

        // Create a new booking
        const newBooking = new Booking({
            userId,
            appointmentType,
            doctor,
            date,
            time,
            description,
            nextOfKin,
        });

        await newBooking.save();

        res.status(201).json({ message: "Booking successful!" });   
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Booking failed" });
  } 
    
  } else if (req.method === "DELETE") {
    try {
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      // Restore the canceled time slot
      await Doctor.findByIdAndUpdate(booking.doctor, { $push: { availableSlots: booking.time } });

      // Delete the booking
      await Booking.findByIdAndDelete(bookingId);

      res.status(200).json({ message: "Appointment canceled, slot restored" });
  } catch (error) {
      res.status(500).json({ error: "Cancellation failed" });
  }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
   

}

/**
   * 
  if (req.method === "GET") {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const bookings = await Booking.find({ userId }).sort({ date: -1 });

      return res.status(200).json({ success: true, data: bookings });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch bookings" });
    }
  } else {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

   * if (req.method === "POST") {
    try {
      const { appointmentType, doctor, date, time, description, nextOfKin, userId } = req.body;

      if (!appointmentType || !doctor || !date || !time || !description) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const newBooking = new Booking({
      userId,
      appointmentType,
      doctor,
      date,
      time,
      description,
      nextOfKin,
  });
 
    await newBooking.save();
  res.status(201).json({ message: "Booking successful" });
  console.log("Booking successful", req.body);
} catch (error) {
  console.error("Booking Error:", error);
  res.status(500).json({ error: "Failed to create booking" });
}
} else {
  // 🚨 THIS IS IMPORTANT
res.setHeader("Allow", ["POST"]);
res.status(405).json({ error: "Method not allowed" });

   */
  
  /** const session = await getSession({ req });

      if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const booking = new Booking({ ...req.body, userId: session.user.id });
      await booking.save();
      return res.status(201).json({ message: "Booking successful", booking });
    } catch (error) {
      return res.status(500).json({ message: "Error booking appointment", error });
    }
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }*/






     // This was unreachable before! Check Github Commit History
    /**try {
      const { appointmentType, doctor, date, time, description, nextOfKin, userId } = req.body;

      if (!appointmentType || !doctor || !date || !time || !description || !userId) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Ensure doctor is stored as ObjectId
      const doctorExists = await Doctor.findById(doctor);
      if (!doctorExists) {
        return res.status(400).json({ error: "Doctor not found" });
      }
      
      const newBooking = new Booking({
        userId,
        appointmentType,
        doctor,
        date,
        time,
        description,
        nextOfKin,
      });

      await newBooking.save();
      return res.status(201).json({ message: "Booking successful", booking: newBooking });
    } catch (error) {
      console.error("Booking Error:", error);
      return res.status(500).json({ error: "Failed to create booking" });
    } */






       /**  Check if the selected time slot is still available
      const doctorData = await Doctor.findById(doctor);
      if (!doctorData || !doctorData.availableSlots.includes(time)) {
          return res.status(400).json({ error: "Time slot unavailable. Please choose another." });
      }

      // Create a new booking
      const newBooking = await Booking.create({ userId, appointmentType, doctor, date, time, description, nextOfKin });

      // Remove the booked time slot
      await Doctor.findByIdAndUpdate(doctor, { $pull: { availableSlots: time } });

      res.status(201).json(newBooking); */
