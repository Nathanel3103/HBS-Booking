import dbConnect from "../../lib/mongodb";
import User from "../../models/User";

export default async function handler(req, res) {
  await dbConnect(); // Ensure DB connection

  if (req.method === "GET") {
    try {
      const { email } = req.query;
      const user = await User.findOne({ email });

      if (!user) return res.status(404).json({ message: "User not found" });

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  } else if (req.method === "PUT") {
    try {
      const { email, updates } = req.body;

      const user = await User.findOneAndUpdate({ email }, updates, { new: true });

      if (!user) return res.status(404).json({ message: "User not found" });

      res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile", error });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
