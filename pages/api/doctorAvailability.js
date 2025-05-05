import dbConnect from "../../lib/mongodb";
import Doctor from "../../models/Doctors";
import Booking from "../../models/Booking";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        await dbConnect();
        const { doctorId, date } = req.query;

        // Find the doctor
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        if (!date) {
            return res.status(400).json({ message: "Missing date parameter" });
        }

        // Compute per-date availability using Booking collection
        const templateSlots = doctor.availableSlots;
        const bookings = await Booking.find({ doctor: doctorId, date })
            .select("time")
            .lean();
        const bookedTimes = bookings.map((b) => b.time);
        const freeSlots = templateSlots.filter((slot) => !bookedTimes.includes(slot));

        return res.status(200).json({ date, freeSlots });

    } catch (error) {
        console.error("Error fetching availability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
