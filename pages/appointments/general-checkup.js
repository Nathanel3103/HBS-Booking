import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Link from "next/link";
import { ArrowLeft, Calendar as LucideCalendar, Clock, User, Phone, Mail, ChevronRight } from "lucide-react";

export default function GeneralCheckup() {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date(),
        time: "",
        doctor: "",
        description: "",
    });

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const res = await fetch("/api/doctors");
                if (!res.ok) throw new Error("Failed to fetch doctors");
                const data = await res.json();
                setDoctors(data);
            } catch (error) {
                console.error("Error fetching doctors:", error);
            }
        };
        fetchDoctors();
    }, []);

    const isDateDisabled = (date) => {
    if (!formData.doctor) return true;
    const selectedDoctor = doctors.find((doc) => doc._id === formData.doctor);
    if (!selectedDoctor) return true;

    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const isWorkingDay = selectedDoctor.workingHours.some((day) => day.day === dayName);
    if (!isWorkingDay) return true;

    // Use local YYYY-MM-DD format for comparison
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const bookedCount = selectedDoctor.appointmentsBooked.filter(
        (appointment) => appointment.date === formattedDate
    ).length;

    const slotsForDay = selectedDoctor.availableSlotsByDay?.[dayName] || selectedDoctor.availableSlots || [];
    return bookedCount >= slotsForDay.length;
};

    const handleDoctorChange = async (doctorId) => {
        setFormData((prev) => ({ ...prev, doctor: doctorId, time: "" }));
        setAvailableSlots([]);
    };

    const handleDateChange = async (selectedDate) => {
    if (isDateDisabled(selectedDate)) return;
    setFormData((prev) => ({ ...prev, date: selectedDate, time: "" }));
    if (!formData.doctor) return;
    try {
        // Use local YYYY-MM-DD format for API call
        const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const response = await fetch(`/api/doctorAvailability?doctorId=${formData.doctor}&date=${dateString}`);
        if (!response.ok) throw new Error("Failed to fetch available slots");
        const data = await response.json();

        // Filter out slots that are already booked for this date
        const selectedDoctor = doctors.find((doc) => doc._id === formData.doctor);
        const bookedSlots = selectedDoctor?.appointmentsBooked
            .filter((appointment) => appointment.date === dateString)
            .map((appointment) => appointment.time) || [];
        const filteredSlots = data.freeSlots.filter(slot => !bookedSlots.includes(slot));
        setAvailableSlots(filteredSlots);
    } catch (error) {
        console.error("Error fetching available slots:", error);
    }
};

    const handleSubmit = async (e) => {
        e.preventDefault();

        const bookingData = {
            userId: user.id,
            appointmentType: "General Checkup",
            doctor: formData.doctor,
            date: `${formData.date.getFullYear()}-${String(formData.date.getMonth() + 1).padStart(2, '0')}-${String(formData.date.getDate()).padStart(2, '0')}`,
            time: formData.time,
            description: formData.description,
            source: "Web",
        };

        // Save to sessionStorage and redirect to payment
        sessionStorage.setItem("pendingBooking", JSON.stringify(bookingData));
        window.location.href = "/payment"; // client-side redirect
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-6 bg-white rounded-lg shadow-lg border border-gray-200 p-8">
            <Link href="/patient-dashboard" className="flex items-center group">
              <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-teal-600 transition-colors duration-200 group-hover:-translate-x-1" />
            </Link>
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Book an Appointment</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Select Doctor</label>
                        <select
                            value={formData.doctor}
                            onChange={(e) => handleDoctorChange(e.target.value)}
                            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                            required
                        >
                            <option value="">Select a Doctor</option>
                            {doctors.map((doctor) => (
                                <option key={doctor._id} value={doctor._id}>
                                    {doctor.name} ({doctor.specialization})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="calendar-container bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Select Appointment Date</label>
                        <Calendar
                            onChange={handleDateChange}
                            value={formData.date}
                            tileDisabled={({ date }) => isDateDisabled(date)}
                            minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                            maxDate={new Date(new Date().setMonth(new Date().getMonth() + 2))}

                            tileClassName={({ date }) => {
                                return isDateDisabled(date) ? 'invisible-tile' : null;//if date is fully booked it becomes invisible
                            }}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Select Time Slot</label>
                        <select
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out"
                            required
                        >
                            <option value="">Select a Time Slot</option>
                            {availableSlots.map((slot, index) => (
                                <option key={index} value={slot}>{slot}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Checkup Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out min-h-[100px]"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 w-full"
                    >
                        Book Appointment
                    </button>
                </form>
            </div>
            <style jsx global>{`
                .invisible-tile {
                    opacity: 0;
                    pointer-events: none;
                }
                .invisible-tile abbr {
                    display: none;
                }
                .react-calendar__tile--disabled {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `}</style>
        </div>
    );
}