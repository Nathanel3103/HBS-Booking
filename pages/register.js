import { useState } from "react";
import { useRouter } from "next/router";
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

    try {

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phoneNumber, role }),
      });

      const userdata = JSON.stringify({ name, email, password, phoneNumber, role });
      console.log("Collected user data is ", userdata);

      const data = await response.json();


      if (response.ok) {
        setSuccess("User registered successfully!");
        console.log("Response is okay");
        setError("");
        setTimeout(() => router.push("/login"), 2000); // Redirect to login
      } else {
        setError(data.error || "Error registering user");
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        {error && <p className="text-red-500">{error}</p>}
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
            type=""
            placeholder="788077462"
            className="p-2 border rounded mb-2"
            value={phoneNumber}
            onChange={setphoneNumber}
            //onChange={(e) => setphoneNumber(e.target.value)}
            //onChange={setphoneNumber => this.setState({setphoneNumber})}
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
          <a href="/login" className="text-blue-500">Login here</a>
        </p>
      </div>
    </div>
  );
}
