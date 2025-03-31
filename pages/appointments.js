import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const router = useRouter();
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

    useEffect(() => {
        if (!userEmail) {
            alert("Please log in to view your appointments.");
            router.push("/login");
            return;
        }

        const storedAppointments = JSON.parse(localStorage.getItem("appointments")) || [];
        setAppointments(storedAppointments.filter((appt) => appt.userEmail === userEmail));
    }, [userEmail, router]);

    const handleCancelAppointment = (id) => {
        const updatedAppointments = appointments.filter((appt) => appt.id !== id);
        setAppointments(updatedAppointments);
        localStorage.setItem("appointments", JSON.stringify(updatedAppointments));
        alert("Appointment canceled.");
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">My Appointments</h1>
            {appointments.length > 0 ? (
                appointments.map((appt) => (
                    <div key={appt.id} className="border p-4 rounded mb-2">
                        <p className="text-lg font-semibold">
                            Dr. {appt.doctor.name} - {appt.doctor.specialty}
                        </p>
                        <p className="text-gray-600">Time: {appt.timeSlot}</p>
                        <button
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded mt-2"
                        >
                            Cancel Appointment
                        </button>
                    </div>
                ))
            ) : (
                <p className="text-gray-500">No appointments booked.</p>
            )}
        </div>
    );
}
