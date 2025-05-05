import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Menu } from "lucide-react"; // Hamburger icon
import ManageDoctors from "../components/ManageDoctors";
import Appointments from "../components/Appointments";
import Patients from "../components/Patients";
import NotifiedPatients from "../components/NotifiedPatients";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("doctors");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userRole = localStorage.getItem("userRole");
        if (userRole !== "admin") {
            // router.push("/login");
        } else {
            setIsLoggedIn(true);
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        alert("Logged out successfully!");
        router.push("/login");
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-6 transform transition-transform duration-300 ease-in-out z-40
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                md:translate-x-0 md:relative md:flex md:flex-col`}
            >
                <div className="flex flex-col items-center mb-6 space-y-2">
                    <img src="/logoMain.png" alt="App Logo" className="h-12 w-auto" />
                    <h2 className="text-xl font-semibold">Admin Dashboard</h2>
                </div>

                <ul className="flex-1 space-y-2">
                    <SidebarItem label="Manage Doctors" active={activeTab === "doctors"} onClick={() => handleTab("doctors")} />
                    <SidebarItem label="View Appointments" active={activeTab === "appointments"} onClick={() => handleTab("appointments")} />
                    <SidebarItem label="Patients" active={activeTab === "patients"} onClick={() => handleTab("patients")} />
                    <SidebarItem label="Notified Patients" active={activeTab === "patientnotifications"} onClick={() => handleTab("patientnotifications")} />
                </ul>
            </div>

            {/* Main Section */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Top Navbar */}
                <nav className="flex items-center justify-between bg-white shadow px-4 py-3 sticky top-0 z-30">
                    <div className="flex items-center space-x-3">
                        {/* Hamburger Menu */}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-gray-700">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
                    >
                        Logout
                    </button>
                </nav>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4">
                    {activeTab === "doctors" && <ManageDoctors />}
                    {activeTab === "appointments" && <Appointments />}
                    {activeTab === "patients" && <Patients />}
                    {activeTab === "patientnotifications" && <NotifiedPatients />}
                </main>
            </div>
        </div>
    );

    function handleTab(tab) {
        setActiveTab(tab);
        setIsSidebarOpen(false); // close sidebar on mobile
    }
}

function SidebarItem({ label, active, onClick }) {
    return (
        <li
            onClick={onClick}
            className={`p-3 cursor-pointer rounded-lg text-center transition duration-200 ${
                active ? "bg-gray-700" : "hover:bg-gray-800"
            }`}
        >
            {label}
        </li>
    );
}
