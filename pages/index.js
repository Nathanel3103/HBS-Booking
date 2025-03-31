import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Loginpage  from "./login";

export default function Home() {
  return(
    <Loginpage/>
  );

}

/**
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const storedDoctors = JSON.parse(localStorage.getItem("doctors")) || [];
    setDoctors(storedDoctors);

    const storedAppointments = JSON.parse(localStorage.getItem("appointments")) || [];
    setAppointments(storedAppointments);
  }, []);

  const generateTimeSlots = (hours) => {
    if (!hours) return [];
    const [start, end] = hours.split("-").map(Number);
    const slots = [];
    for (let i = start; i < end; i++) {
        slots.push(`${i}:00 - ${i}:30`, `${i}:30 - ${i + 1}:00`);
    }
    return slots;
};


  const handleBookAppointment = (doctor, timeSlot) => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      alert("Please log in to book an appointment.");
      router.push("/login");
      return;
    }

    const newAppointment = { id: Date.now(), doctor, userEmail, timeSlot };
    const updatedAppointments = [...appointments, newAppointment];
    setAppointments(updatedAppointments);
    localStorage.setItem("appointments", JSON.stringify(updatedAppointments));

    alert(`Appointment booked with Dr. ${doctor.name} at ${timeSlot}`);
  };

  return (
    <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Available Doctors</h1>
            {doctors.length > 0 ? (
                doctors.map((doctor) => {
                    const timeSlots = generateTimeSlots(doctor.availableHours);
                    return (
                        <div key={doctor.id} className="border p-4 rounded mb-4">
                            <p className="text-lg font-semibold">{doctor.name} - {doctor.specialty}</p>
                            <p className="text-gray-600">Available Hours: {doctor.availableHours || "Not Set"}</p>
                            <div className="mt-2">
                                {timeSlots.length > 0 ? (
                                    timeSlots.map((slot) => {
                                        const isBooked = appointments.some(
                                            (appt) => appt.doctor.id === doctor.id && appt.timeSlot === slot
                                        );
                                        return (
                                            <button
                                                key={slot}
                                                disabled={isBooked}
                                                onClick={() => handleBookAppointment(doctor, slot)}
                                                className={`px-3 py-1 m-1 rounded ${
                                                    isBooked ? "bg-gray-400" : "bg-blue-500 text-white"
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <p className="text-gray-500">No available slots</p>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <p className="text-gray-500">No doctors available.</p>
            )}
        </div>
  ); */