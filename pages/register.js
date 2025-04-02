import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setphoneNumber] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false
  });
  const router = useRouter();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters long");
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phoneNumber, role }),
      });

      const data = await response.json();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 m-4 rounded-xl shadow-lg bg-white">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Register</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-600">
            {typeof error === 'string' ? error : 'An error occurred'}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-600">
            {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              className={`w-full px-4 py-2 rounded-lg border ${
                touched.name && !name
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-gray-200 bg-white'
              } text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched({ ...touched, name: true })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className={`w-full px-4 py-2 rounded-lg border ${
                touched.email && !validateEmail(email)
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-gray-200 bg-white'
              } text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched({ ...touched, email: true })}
              required
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full px-4 py-2 rounded-lg border ${
                  touched.password && !validatePassword(password)
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-gray-200 bg-white'
                } text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched({ ...touched, password: true })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Phone Number
            </label>
            <PhoneInput
              country={'zw'}
              placeholder="788077462"
              containerClass=""
              inputClass={`w-full px-4 py-2 rounded-lg !w-full ${
                touched.phone && !phoneNumber
                  ? '!border-rose-200 !bg-rose-50'
                  : '!border-gray-200 !bg-white'
              } !text-gray-800`}
              buttonClass="!border-gray-200"
              dropdownClass="!bg-white !text-gray-800"
              value={phoneNumber}
              onChange={(value) => setphoneNumber(value)}
              onBlur={() => setTouched({ ...touched, phone: true })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Role
            </label>
            <select
              className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="patient">Patient</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-colors duration-200"
          >
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

// Add this to your global CSS or a new style tag in your document head
const styles = `
  .dark-phone-input .selected-flag:hover,
  .dark-phone-input .selected-flag:focus,
  .dark-phone-input .country-list {
    background-color: #374151 !important;
  }

  .dark-phone-input .country-list .country:hover {
    background-color: #4B5563 !important;
  }

  .dark-phone-input .country-list .country {
    color: white !important;
  }
`;
