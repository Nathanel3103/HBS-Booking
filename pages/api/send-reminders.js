import dbConnect from "../../lib/mongodb";
import Booking from "../../models/Booking";
import User from "../../models/User";
import Doctor from "../../models/Doctors";
import NotifiedPatient from "../../models/NotifiedPatient";
import { sendSms } from "../../utils/sendSms";
import moment from "moment";

export default async function handler(req, res) {
  console.log("SENDING REMINDERS");

  await dbConnect();
  console.log("Connecting to the Database");

  try {
    const tomorrow = moment().add(1, "days").startOf("day").toDate();
    const endOfTomorrow = moment().add(1, "days").endOf("day").toDate();

    const bookings = await Booking.find({
      date: { $gte: tomorrow, $lt: endOfTomorrow },
    }).populate("doctor");

    if (bookings.length === 0) {
      return res.status(200).json({ message: "No appointments for tomorrow." });
    }

    for (const booking of bookings) {
      console.log("Processing booking ID:", booking._id);

      const { userId, doctor, description, date } = booking;
      const user = await User.findById(userId);

      if (!user || !user.phoneNumber) {
        console.warn(`No phone number found for user ID: ${userId}`);
        continue;
      }

      const phoneNumber = user.phoneNumber.startsWith("+")
        ? user.phoneNumber
        : `+${user.phoneNumber}`;

      const message = `Reminder: Your appointment with Dr. ${doctor.name} is scheduled for ${moment(
        date
      ).format("MMMM Do YYYY")}. Details: ${description || "No description provided."}`;

      console.log(`Sending reminder to: ${phoneNumber}`);

      await sendSms(phoneNumber, message);

      // Log the notified patient in the database
      await NotifiedPatient.create({
        userId,
        name: user.name,
        phoneNumber,
        doctorName: doctor.name,
        appointmentDate: date,
        description,
      });
    }

    res.status(200).json({ message: "Reminders sent and logged successfully." });
    console.log("Reminders sent and logged successfully.");
  } catch (error) {
    console.error("Error sending reminders:", error);
    res.status(500).json({ error: "Failed to send reminders." });
  }
}
