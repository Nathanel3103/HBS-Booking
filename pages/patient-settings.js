import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PatientSettings() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    employmentStatus: "",
    phoneNumber: "",
    email: "",
    streetAddress: "",
    city: "",
  });

  const router = useRouter();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      router.push("/login");
    } else {
      setUser(storedUser);
      fetch(`/api/user?email=${storedUser.email}`)
        .then((res) => res.json())
        .then((data) => setFormData(data))
        .catch((err) => console.error("Error fetching user:", err));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, updates: formData }),
    });

    if (response.ok) {
      alert("Profile updated successfully!");
      console.log("Profile updated successfully!", formData);
    } else {
      alert("Failed to update profile.");
    }
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Patient Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border rounded" />
        <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-2 border rounded" />
        <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        
        {/* Marital Status Dropdown */}
        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Marital Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
          <option value="Registered Partnership">Registered Partnership</option>
          <option value="Living Common Law">Living Common Law</option>
        </select>


        {/* Employment Status Dropdown */}
        <select name="employmentStatus" value={formData.employmentStatus} onChange={handleChange} className="w-full p-2 border rounded">
          <option value="">Select Employment Status</option>
          <option value="Employed">Employed</option>
          <option value="Unemployed">Unemployed</option>
        </select>
        
        
        
        <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 border rounded" />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded" disabled />
        <input type="text" name="streetAddress" value={formData.streetAddress} onChange={handleChange} placeholder="Street Address" className="w-full p-2 border rounded" />
        <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" className="w-full p-2 border rounded" />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">Update Profile</button>
      </form>
    </div>
  );
}
