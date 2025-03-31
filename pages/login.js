import { useState } from "react";
import { useRouter } from "next/router";
import PatientDashboard from "./patient-dashboard";
import AdminDashboard from "./admin-dashboard";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    try {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          setError(data.message);
          return;
        }

        console.log("Login Successfull", data);
  
        // Store user info in localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
  

        // Debugging: Check if user is properly stored
        const storedUser = localStorage.getItem("user");
        console.log("Stored User After Login:", storedUser);

        console.log("Redirecting to dashboard...");

        // Redirect based on role
        setTimeout(() => {
          if (data.user.role === "admin") {
            console.log("Redirecting to admin dashboard...");
            router.push("/admin-dashboard");
          } else {
            console.log("Redirecting to patient dashboard...");
            router.push("/patient-dashboard");
          }
        }, 500);
  
      } catch (err) {
        console.error("Login error:", err);
        setError("Something went wrong. Please try again.");
      }
    };
  
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">Login</h2>
          {error && <p className="text-red-500">{error}</p>}
          <form onSubmit={handleLogin} className="flex flex-col">
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
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
              Login
            </button>
          </form>
          <p className="mt-4 text-sm">
            Don't have an account?{" "}
            <a href="/register" className="text-blue-500">Register here</a>
          </p>
        </div>
      </div>
    );
  }