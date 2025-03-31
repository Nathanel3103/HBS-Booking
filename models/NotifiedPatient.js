import mongoose from "mongoose";

const NotifiedPatientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  doctorName: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  description: { type: String },
  notifiedAt: { type: Date, default: Date.now },
});

export default mongoose.models.NotifiedPatient ||
  mongoose.model("NotifiedPatient", NotifiedPatientSchema);
