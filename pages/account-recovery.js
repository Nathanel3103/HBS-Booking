import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { 
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

export default function AccountRecovery() {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Only run on component unmount to clean up
  useEffect(() => {
    return () => {
      // Clear state only when leaving the page
      setStep(1);
      setIdentifier("");
      setDateOfBirth("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setError("");
      setSuccess("");
      setIsLoading(false);
    };
  }, []);

  // Handle redirect after successful password reset
  useEffect(() => {
    let timer;
    if (success && success.includes("successfully") && step === 3) {
      timer = setTimeout(() => {
        router.push("/login");
      }, 5000); // Increased from 2000ms to 5000ms
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success, router, step]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!identifier) {
      setError("Please enter your username or phone number");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/verify-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json();

      if (response.ok && data.exists) {
        setStep(2);
      } else {
        setError(data.message || "No account found with that information");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!dateOfBirth) {
      setError("Please enter your date of birth");
      setIsLoading(false);
      return;
    }

    // Add validation to ensure date is in the past
    const dobDate = new Date(dateOfBirth);
    const today = new Date();
    if (dobDate > today) {
      setError("Date of birth must be in the past");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier,
          dateOfBirth,
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password reset successfully!");
        setStep(3);
      } else {
        setError(data.message || "Password reset failed");
      }
    } catch (err) {
      console.error("Reset error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 m-4 rounded-xl shadow-lg bg-white">
        {/* Logo */}
        <div className="flex justify-center mb-6 bg-[#0c8fad] rounded-xl">
          <img
            src="/logo.png"
            alt="App Logo"
            className="h-16 w-auto"
          />
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Account Recovery</h2>
          <p className="mt-2 text-gray-600">Reset your password in two simple steps</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-600">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-600">
            {success}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Username 
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {step === 1 ? "Verifying..." : "Resetting..."}
                </>
              ) : (
                step === 1 ? "Continue" : "Reset Password"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}