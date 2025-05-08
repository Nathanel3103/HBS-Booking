import dbConnect from "../../lib/mongodb";
import User from "../../models/User";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { identifier } = req.body;
    
    if (!identifier || identifier.trim() === '') {
      return res.status(400).json({ message: 'Username or phone number is required' });
    }

    // Check if user exists by email, phone number, or name
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier },
        { name: identifier }
      ]
    });

    if (user) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(404).json({ 
        exists: false, 
        message: 'No account found with that information' 
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ 
      message: 'Server error during verification',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}