import dbConnect from "../../lib/mongodb";
import Booking from "../../models/Booking";
import { verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  await dbConnect();

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    try {
      const newBooking = new Booking(req.body);
      await newBooking.save();
      res.status(201).json({ message: "Appointment booked successfully!" });
    } catch (error) {
      res.status(500).json({ error: "Error saving appointment" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
