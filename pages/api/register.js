import dbConnect from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    const { name, email, password, phoneNumber, role } = req.body;

if (!name || !email || !password || !phoneNumber || !role) {
      return res.status(400).json({ message: "All fields, including phone number, are required." });
  } 
   
  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password before saving
    //const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);

    if (phoneNumber === ""){
      console.log("Phone number not being identified we have this ",phoneNumber);
    };

    // Create a new user
    const newUser = new User({
        name,
        email,
        password: hashedPassword,
        phoneNumber, // Store the phone number
        role: role || "patient",
    });

    await newUser.save();

    return res.status(201).json({message: "User registered successfully",});
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
}
}

return res.status(405).json({ message: "Method not allowed" });

  /** 
   * user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            role: role || "patient",
        },
   * 
   * 
   * try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Create new user
        const newUser = new User({
          name,
          email,
          password: hashedPassword, // Store hashed password
          role: role || "patient"
        });
  
        await newUser.save();
  
        res.status(201).json({ message: "User registered successfully!" });
      } catch (error) {
        res.status(500).json({ error: "Error registering user" });
      }
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
*/  
    }
