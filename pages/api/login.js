import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    try {
        await dbConnect();

        if (req.method === "POST") {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password are required." });
            }

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // Compare entered password with stored hashed password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Send only necessary user details with token
            return res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role
                }
            });
        }

        return res.status(405).json({ message: "Method not allowed" });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            message: "Server error", 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}