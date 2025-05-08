import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "patient"], default: "patient" },
  dateOfBirth: Date,
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  maritalStatus: String,
  employmentStatus: String,
  phoneNumber: { type: String, required: true },
  streetAddress: String,
  city: String,
  nextOfKin: {
    name: { type: String },
    phone: { type: String },
  },
  securityQuestion: {
    question: { type: String, required: false },
    answer: { type: String, required: false, select: false }
  },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false }
});






export default mongoose.models.User || mongoose.model("User", UserSchema);
