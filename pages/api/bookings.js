import dbConnect from "../../lib/mongodb";
import Booking from "../../models/Booking";
import Doctor from "../../models/Doctors"; // Import the Doctor model
import { getSession } from "next-auth/react";
import mongoose from 'mongoose'; // Import mongoose

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const { userId, doctorId, date } = req.query;

      // Handle fetching bookings for a specific doctor and date
      if (doctorId && date) {
        const bookings = await Booking.find({ doctor: doctorId, date }).select("time");
        return res.status(200).json({ success: true, bookings });
      }

      // Handle fetching user's booking history
      if (userId) {
        const bookings = await Booking.find({ userId })
          .populate('doctor', 'name specialization') // Populate doctor details
          .sort({ date: -1 });
        return res.status(200).json({ success: true, data: bookings });
      }

      return res.status(400).json({ error: "Missing required parameters" });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch bookings" });
    }
  } else if (req.method === "POST") {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { userId, appointmentType, doctor, date, time, description, nextOfKin } = req.body;

      const doctorRecord = await Doctor.findById(doctor).session(session);
      if (!doctorRecord) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Doctor not found" });
      }

      // Verify slot is still available (pre-check for better UX)
      if (!doctorRecord.availableSlots.includes(time)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Time slot no longer available" });
      }

      // Create and save booking
      const newBooking = new Booking({
        userId,
        appointmentType,
        doctor: doctorRecord._id,
        date,
        time,
        description,
        nextOfKin,
      });

      await newBooking.save({ session });

      // Update doctor - both appointmentsBooked AND availableSlots
      await Doctor.findByIdAndUpdate(
        doctor,
        { 
          $addToSet: { appointmentsBooked: { patientId: userId, date, time } },
          $pull: { availableSlots: time } 
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return res.status(201).json({ message: "Booking successful!" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      if (error.code === 11000) {
        return res.status(409).json({ message: "That slot was just taken, pick another time." });
      }
      console.error(error);
      return res.status(500).json({ error: "Booking failed" });
    }
  } else if (req.method === "DELETE") {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { bookingId } = req.body;

      const booking = await Booking.findById(bookingId).populate('doctor').session(session);
      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: "Booking not found" });
      }

      // Restore the canceled time slot
      await Doctor.findByIdAndUpdate(
        booking.doctor._id,
        { 
          $pull: { appointmentsBooked: { time: booking.time } },
          $addToSet: { availableSlots: booking.time } 
        },
        { session }
      );

      // Delete the booking
      await Booking.findByIdAndDelete(bookingId, { session });

      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ message: "Appointment canceled, slot restored" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ error: "Cancellation failed" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
   * 
  

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
  // THIS IS IMPORTANT
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
