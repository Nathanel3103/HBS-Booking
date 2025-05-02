import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointmentType: { type: String, required: true }, // General Checkup, Specialist Visit, etc.
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  description: { type: String },
  source: { type: String, enum: ["Web", "WhatsApp"], required: true, default: "Web" }, // <-- identification in the database


  patientDetails: {
    firstName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    employmentStatus: { type: String },
    phoneNumber: { type: String },
    email: { type: String },
    address: { type: String },
    city: { type: String },
    relationToAccountOwner: { type: String },
  },
});

//  unique compound index
BookingSchema.index(
  { doctor: 1, date: 1, time: 1 },
  { unique: true, name: "uniq_doctor_date_time" }
);

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
