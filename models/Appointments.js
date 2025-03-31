import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Doctor", 
    required: true 
  }, // Reference to the Doctor

  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }, // Reference to the Patient

  appointmentDateTime: { 
    type: Date, 
    required: true 
  }, // Date and Time of Appointment

  status: { 
    type: String, 
    enum: ["Confirmed", "Cancelled", "Pending"], 
    default: "Pending" 
  }, // Status of the appointment
});

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema);
