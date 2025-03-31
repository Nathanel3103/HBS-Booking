import dbConnect from "../../lib/mongodb";
import Doctor from "../../models/Doctors";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        await dbConnect();
        const { doctorId } = req.query;

        // Find the doctor
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        // Get doctor's working days
        const workingDays = doctor.workingHours.map((day) => day.day); // ["Monday", "Wednesday", ...]

        // Fetch already booked appointments
        const bookedAppointments = doctor.appointmentsBooked;

        // Create an object to track booked slots for each date
        const bookedSlotsByDate = {};
        bookedAppointments.forEach(({ date, time }) => {
            if (!bookedSlotsByDate[date]) {
                bookedSlotsByDate[date] = [];
            }
            bookedSlotsByDate[date].push(time);
        });

        // Get available dates
        const availableDates = doctor.availableSlots.filter((dateSlot) => {
            const dayOfWeek = new Date(dateSlot).toLocaleString("en-US", { weekday: "long" });
            return workingDays.includes(dayOfWeek);
        });

        // Generate available time slots for each date
        const availableSlots = availableDates.map((date) => {
            const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });
            const workingHours = doctor.workingHours.find((wh) => wh.day === dayOfWeek);

            if (!workingHours) return null; // Skip dates not in working hours

            const { startTime, endTime } = workingHours;

            // Generate time slots in 30-minute intervals
            const allTimeSlots = [];
            let currentTime = new Date(`2000-01-01T${startTime}`);
            const endTimeObj = new Date(`2000-01-01T${endTime}`);

            while (currentTime < endTimeObj) {
                allTimeSlots.push(currentTime.toTimeString().slice(0, 5)); // "HH:MM"
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }

            // Remove booked slots
            const availableTimes = allTimeSlots.filter((slot) => !bookedSlotsByDate[date]?.includes(slot));

            return {
                date,
                availableTimes,
                fullyBooked: availableTimes.length === 0,
            };
        }).filter(Boolean); // Remove null values

        res.status(200).json({ availableSlots });

    } catch (error) {
        console.error("Error fetching availability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
