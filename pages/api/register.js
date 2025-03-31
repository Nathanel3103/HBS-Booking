import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        // Connect to database
        const conn = await dbConnect();
        if (!conn) {
            throw new Error("Failed to connect to database");
        }

        const { name, email, password, phoneNumber, role = "patient" } = req.body;

        // Validate required fields
        const requiredFields = { name, email, password, phoneNumber };
        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(", ")}`
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ 
                message: "Password must be at least 6 characters long." 
            });
        }

        // Validate role
        if (role && !["admin", "patient"].includes(role)) {
            return res.status(400).json({ 
                message: "Invalid role. Must be either 'admin' or 'patient'." 
            });
        }

        // Check for existing user
        const existingUser = await User.findOne({ email }).select('email');
        if (existingUser) {
            return res.status(400).json({ 
                message: "User already exists with this email." 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phoneNumber: phoneNumber.trim(),
            role: role || "patient"
        });

        // Save user to database
        await newUser.save();

        // Return success response
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                name: newUser.name,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: "Validation error",
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        // Handle mongoose duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        // Handle other errors
        return res.status(500).json({
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}
