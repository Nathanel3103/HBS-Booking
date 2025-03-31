import dbConnect from "../../../lib/mongodb";
import Doctor from "../../../models/Doctors";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      await Doctor.findByIdAndDelete(id);
      res.status(200).json({ message: "Doctor deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete doctor" });
    }
  } else {
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
