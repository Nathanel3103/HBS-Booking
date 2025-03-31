import mongoose from "mongoose";

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Full Name
  specialization: { type: String, required: true }, // Specialization (e.g., Cardiologist, Dentist)
  availableSlots: [{ type: String }], // List of time slots available for booking
  workingHours: [
    {
      day: { type: String, required: true }, // The day (e.g., Monday)
      startTime: { type: String, required: true }, // Start time (e.g., "08:00 AM")
      endTime: { type: String, required: true }, // End time (e.g., "05:00 PM")
    },
  ],
  appointmentsBooked: [
    {
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the User (patient)
      date: { type: String, required: true }, // Date of the appointment
      time: { type: String, required: true }, // Time of the appointment
    },
  ],
});

export default mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);
