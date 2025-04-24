import dbConnect from '../../lib/mongodb';
import Booking from '../../models/Booking';

export default async function handler(req, res) {
  await dbConnect();

  try {
    // Fetch only WhatsApp bookings
    const whatsappBookings = await Booking.find({ source: "WhatsApp" });
    res.status(200).json(whatsappBookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch WhatsApp bookings" });
  }
}
