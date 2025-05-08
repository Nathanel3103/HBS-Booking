import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { identifier, dateOfBirth, newPassword } = req.body;
    
    if (!identifier || !dateOfBirth || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find user by username, phone number, or name
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier },

        { name: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }




    // Verify date of birth - improved date handling
    const formatDate = (date) => {
      if (!date) return null;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null; // Invalid date
      return d.toISOString().split('T')[0];
    };
    

    const userDOB = formatDate(user.dateOfBirth);
    const providedDOB = formatDate(dateOfBirth);
    
    if (!userDOB || !providedDOB || userDOB !== providedDOB) {
      return res.status(400).json({ message: 'Date of birth does not match our records' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    

    // Update user's password
    user.password = hashedPassword;
    await user.save();
    

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (saveError) {
    console.error('Save error:', saveError);
    return res.status(400).json({
      message: 'Failed to update password',
      error: process.env.NODE_ENV === 'development' ? saveError.message : null
    });
  }
}