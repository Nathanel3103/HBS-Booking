import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Menu, X } from "lucide-react"; // Import icons

export default function PatientDashboard() {
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [phoneMissing, setPhoneMissing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        console.log("Checking localStorage for user...");
        const loggedInUser = JSON.parse(localStorage.getItem("user"));
        if (!loggedInUser) {
            console.log("No user found, redirecting to login...");
        } else {
            setUser(loggedInUser);
            if (!loggedInUser.phoneNumber || loggedInUser.phoneNumber.trim() === "") {
                setPhoneMissing(true);
            }
        }
    }, []);

    if (!user) {
        return <p className="text-center text-gray-600 mt-10">Loading...</p>;
    }

    const handleLogout = () => {
        localStorage.removeItem("user");
        router.push("/login");
    };

    const handleNavigation = (path) => {
        if (phoneMissing) {
            alert("Please update your phone number in settings before making a booking.");
            router.push("/patient-settings");
            return;
        }
        router.push(path);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar */}
            <nav className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
                <h1 className="text-2xl font-bold tracking-wide">Patient Dashboard</h1>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-6">
                    <p className="text-lg">Welcome, {user.name || "User"}!</p>
                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
                        Logout
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="md:hidden bg-blue-700 text-white p-4 flex flex-col items-center space-y-4">
                    <p className="text-lg">Welcome, {user.name || "User"}!</p>
                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                        Logout
                    </button>
                </div>
            )}

            {/* Dashboard Content */}
            <div className="flex flex-col items-center p-6">
                {phoneMissing && (
                    <p className="text-red-500 mb-4 text-center">
                        ⚠️ You must enter a phone number in settings before booking an appointment.
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mt-6">
                    {[
                        { label: "Book Appointment", color: "bg-blue-500", path: "./appointments/general-checkup" },
                        //{ label: "Specialist Visit", color: "bg-green-500", path: "./appointments/specialist-visit" },
                        //{ label: "Book for Someone Else", color: "bg-yellow-500", path: "./appointments/book-for-someone" },
                        //{ label: "Vaccination Booking", color: "bg-purple-500", path: "./appointments/vaccination" },
                        { label: "Settings", color: "bg-gray-500", path: "/patient-settings" },
                        { label: "View Booking History", color: "bg-gray-600", path: "/booking-history" },
                    ].map((item, index) => (
                        <button
                            key={index}
                            onClick={() => handleNavigation(item.path)}
                            className={`${item.color} text-white p-6 rounded-lg shadow-md text-lg font-semibold w-full transition transform hover:scale-105`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
