import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { ArrowLeft, Clock, Calendar as CalendarIcon, User, FileText } from "lucide-react";
import { useRouter } from "next/router";

export default function GeneralCheckup() {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [disabledDates, setDisabledDates] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date(),
        time: "",
        doctor: "",
        description: "",
    });

    const router = useRouter();
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
        if (!formData.doctor) return true; // Disable all dates if no doctor is selected
    
        const selectedDoctor = doctors.find((doc) => doc._id === formData.doctor);
        if (!selectedDoctor) return true;
    
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date); // Get day name (e.g., "Monday")
    
        // Check if the doctor is available on this day
        const isWorkingDay = selectedDoctor.workingHours.some((day) => day.day === dayName);
        if (!isWorkingDay) return true; // Disable if the doctor doesn't work on this day
    
        // Format date for booked appointments check
        const formattedDate = date.toISOString().split("T")[0];
    
        // Check if the day is fully booked (all slots taken)
        const bookedSlots = selectedDoctor.appointmentsBooked.filter(appointment => appointment.date === formattedDate).length;
        if (bookedSlots >= selectedDoctor.availableSlots.length) return true; // Disable if fully booked
    
        return false; // Otherwise, the date is available
    };
    

    const handleDoctorChange = async (doctorId) => {
        setFormData({ ...formData, doctor: doctorId });
    
        const selectedDoctor = doctors.find((doc) => doc._id === doctorId);
        if (selectedDoctor) {
            setAvailableSlots(selectedDoctor.availableSlots);
        }
    };
    
    const handleDateChange = async (selectedDate) => {
        if (isDateDisabled(selectedDate)) return;
    
        setFormData((prev) => ({ ...prev, date: selectedDate }));
    
        if (!formData.doctor) return;
    
        try {
            const response = await fetch(`/api/bookings?doctorId=${formData.doctor}&date=${selectedDate.toISOString().split("T")[0]}`);
            if (!response.ok) throw new Error("Failed to fetch booked slots");
            const data = await response.json();
    
            const bookedSlots = data.bookings.map((appointment) => appointment.time);
    
            const selectedDoctor = doctors.find((doc) => doc._id === formData.doctor);
            if (selectedDoctor) {
                const filteredSlots = selectedDoctor.availableSlots.filter((slot) => !bookedSlots.includes(slot));
                setAvailableSlots(filteredSlots);
            }
        } catch (error) {
            console.error("Error fetching booked slots:", error);
        }
    };
    
    
    const handleSubmit = async (e) => {
        e.preventDefault();

        const bookingData = {
            userId: user.id,
            appointmentType: "General Checkup",
            doctor: formData.doctor,
            date: formData.date.toISOString().split("T")[0],
            time: formData.time,
            description: formData.description,
        };

        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            if (response.ok) {
                alert("Booking successful!");
                setFormData({ date: new Date(), time: "", doctor: "", description: ""});
                handleDoctorChange(formData.doctor);
            } else {
                alert("Booking failed. Try again.");
            }
        } catch (error) {
            console.error("Error booking appointment:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => router.push('/patient-dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="text-gray-600" size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
                            <p className="text-sm text-gray-600 mt-1">Schedule your general checkup appointment</p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Doctor Selection */}
                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                Select Doctor
                            </label>
                            <select
                                value={formData.doctor}
                                onChange={(e) => handleDoctorChange(e.target.value)}
                                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                        {/* Calendar and Time Selection Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Calendar Section */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    Select Date
                                </label>
                                <div className="calendar-container p-4 bg-white border border-gray-200 rounded-lg">
                                    <Calendar
                                        onChange={handleDateChange}
                                        value={formData.date}
                                        className="rounded-lg border-0 w-full"
                                        tileDisabled={({ date }) => isDateDisabled(date)}
                                        minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                                        maxDate={new Date(new Date().setMonth(new Date().getMonth() + 2))}
                                    />
                                </div>
                            </div>

<<<<<<< HEAD
                            {/* Time Slots Section */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                    Select Time
                                </label>
                                <div className="grid grid-cols-2 gap-2 p-4 bg-white border border-gray-200 rounded-lg">
                                    {availableSlots.length > 0 ? (
                                        availableSlots.map((slot, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, time: slot })}
                                                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors
                                                    ${formData.time === slot 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="col-span-2 text-center text-gray-500 py-4">
                                            {formData.doctor 
                                                ? "No available slots for selected date" 
                                                : "Please select a doctor first"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                                <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Please describe your reason for visit"
                                className="w-full px-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled={!formData.doctor || !formData.date || !formData.time}
                        >
                            Book Appointment
                        </button>
                    </form>
                </div>
=======
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white p-3 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                        Book Appointment
                    </button>
                </form>
>>>>>>> 2c8a67852656fb88d7715b1a15b3c274c7258cae
            </div>

            {/* Custom Calendar Styles */}
            <style jsx global>{`
                .calendar-container .react-calendar {
                    width: 100%;
                    border: none;
                    background: white;
                }
                .react-calendar__tile {
                    padding: 0.75em 0.5em;
                    font-size: 0.875rem;
                }
                .react-calendar__tile--active {
                    background: #2563eb !important;
                    color: white;
                }
                .react-calendar__tile--disabled {
                    background-color: #f3f4f6;
                    color: #9ca3af;
                }
                .react-calendar__tile:enabled:hover,
                .react-calendar__tile:enabled:focus {
                    background-color: #dbeafe;
                }
                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:enabled:focus {
                    background-color: #dbeafe;
                }
                .react-calendar__navigation button[disabled] {
                    background-color: #f3f4f6;
                }
            `}</style>
        </div>
    );
}
