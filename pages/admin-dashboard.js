import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import ManageDoctors from "@/components/ManageDoctors";
import Appointments from "@/components/Appointments";
import Patients from "@/components/Patients";
import NotifiedPatients from "@/components/NotifiedPatients";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("doctors");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
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
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar  tried changing the sidebar to remain staic but was unable*/}
            <div className="w-64 bg-gray-900 text-white flex flex-col p-6 min-h-screen">
                <h2 className="text-2xl font-bold mb-6 text-center">Admin Dashboard</h2>

                <ul className="flex-1 space-y-2">
                    <SidebarItem 
                        label="Manage Doctors" 
                        active={activeTab === "doctors"} 
                        onClick={() => setActiveTab("doctors")} 
                    />
                    <SidebarItem 
                        label="View Appointments" 
                        active={activeTab === "appointments"} 
                        onClick={() => setActiveTab("appointments")} 
                    />
                    <SidebarItem 
                        label="Patients" 
                        active={activeTab === "patients"} 
                        onClick={() => setActiveTab("patients")} 
                    />
                    <SidebarItem 
                        label="Notified Patients" 
                        active={activeTab === "patientnotifications"} 
                        onClick={() => setActiveTab("patientnotifications")} 
                    />
                </ul>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 p-3 rounded-lg transition duration-200 text-center mt-6"
                >
                    Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto min-h-screen">
                {activeTab === "doctors" && <ManageDoctors />}
                {activeTab === "appointments" && <Appointments />}
                {activeTab === "patients" && <Patients />}
                {activeTab === "patientnotifications" && <NotifiedPatients />}
            </div>
        </div>
    );
}

// Sidebar Item Component
function SidebarItem({ label, active, onClick }) {
    return (
        <li
            className={`p-3 cursor-pointer rounded-lg text-center transition duration-200 ${
                active ? "bg-gray-700" : "hover:bg-gray-800"
            }`}
            onClick={onClick}
        >
            {label}
        </li>
    );
}
