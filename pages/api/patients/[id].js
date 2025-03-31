import dbConnect from "../../../lib/mongodb";
import User from "../../../models/User";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      const updatedPatient = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!updatedPatient) return res.status(404).json({ error: "Patient not found" });
      res.status(200).json(updatedPatient);
    } catch (error) {
      res.status(500).json({ error: "Error updating patient" });
    }
  } else if (req.method === "DELETE") {
    try {
      await User.findByIdAndDelete(id);
      res.status(200).json({ message: "Patient deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error deleting patient" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
