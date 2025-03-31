import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setphoneNumber] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phoneNumber, role }),
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (response.ok) {
        setSuccess("User registered successfully!");
        setError("");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const errorMessage = typeof data.message === 'object' ? 
          JSON.stringify(data.message) : 
          data.message || "Error registering user";
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        {error && <p className="text-red-500">{typeof error === 'string' ? error : 'An error occurred'}</p>}
        {success && <p className="text-green-500">{success}</p>}
        <form onSubmit={handleRegister} className="flex flex-col">
          <input
            type="text"
            placeholder="Full Name"
            className="p-2 border rounded mb-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="p-2 border rounded mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-2 border rounded mb-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PhoneInput
            country={'zw'}
            placeholder="788077462"
            className="p-2 border rounded mb-2"
            value={phoneNumber}
            onChange={(value) => setphoneNumber(value)}
            required
          />
          <select
            className="p-2 border rounded mb-2 "
            value={role}
            onChange={(e) => setRole(e.target.value)}

          >
            <option value="patient">Patient</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Register
          </button>
        </form>
        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500">Login here</Link>
        </p>
      </div>
    </div>
  );
}
