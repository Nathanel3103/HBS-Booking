import dbConnect from "../../lib/mongodb";
import User from "../../models/User";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const patients = await User.find({ role: "patient" }); // Only fetch patients
      res.status(200).json(patients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patients." });
    }
  } else if (req.method === "POST") {
    try {
        const patient = await User.create(req.body);
        res.status(201).json(patient);
      } catch (error) {
        console.log("An Error Occured: ", error.message);
        res.status(400).json({ error: error.message });
      }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
  } 
}
