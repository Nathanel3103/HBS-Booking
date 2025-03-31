import dbConnect from "../../lib/mongodb";
import NotifiedPatient from "../../models/NotifiedPatient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  await dbConnect();

  try {
    const notifiedPatients = await NotifiedPatient.find().sort({ notifiedAt: -1 });
    res.status(200).json(notifiedPatients);
  } catch (error) {
    console.error("Error fetching notified patients:", error);
    res.status(500).json({ error: "Failed to fetch notified patients." });
  }
}
