import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    await dbConnect();

    if (req.method === "POST") {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // Compare entered password with stored hashed password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // Send only necessary user details
            return res.status(200).json({
                message: "Login successful",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role
                }
            });

        } catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    }

    return res.status(405).json({ message: "Method not allowed" });
}