import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function GeneralCheckup() {
    const [availableSlots, setAvailableSlots] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [disabledDates, setDisabledDates] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date(),
        time: "",
        doctor: "",
        description: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
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
            nextOfKin: { 
                name: formData.nextOfKinName, 
                phone: formData.nextOfKinPhone 
            },
        };

        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            if (response.ok) {
                alert("Booking successful!");
                setFormData({ date: new Date(), time: "", doctor: "", description: "", nextOfKinName: "", nextOfKinPhone: "" });
                handleDoctorChange(formData.doctor);
            } else {
                alert("Booking failed. Try again.");
            }
        } catch (error) {
            console.error("Error booking appointment:", error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-lg w-full bg-white p-6 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">Book Appointment</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium">Doctor</label>
                        <select
                            value={formData.doctor}
                            onChange={(e) => handleDoctorChange(e.target.value)}
                            className="border p-3 rounded-lg w-full focus:ring focus:ring-blue-300"
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

                    <div className="flex flex-col">
                        <div className="flex flex-col">
                            <label className="text-gray-700 font-medium">Date of Appointment</label>
                            <Calendar
                                onChange={handleDateChange}
                                value={formData.date}
                                className="border rounded-lg p-2 w-full"
                                tileDisabled={({ date }) => isDateDisabled(date)}
                                minDate={new Date(new Date().setDate(new Date().getDate() + 1))}  // Tomorrow
                                maxDate={new Date(new Date().setMonth(new Date().getMonth() + 2))} // 2 months ahead
                            />
</div>

                    </div>

                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium">Time of Appointment</label>
                        <select
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            className="border p-3 rounded-lg w-full focus:ring focus:ring-blue-300"
                            required
                        >
                            <option value="">Select a Time Slot</option>
                            {availableSlots.length > 0 &&
                                availableSlots.map((slot, index) => (
                                    <option key={index} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium">Description of Checkup</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="border p-3 rounded-lg w-full h-24 focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium">Next of Kin Name</label>
                        <input
                            type="text"
                            value={formData.nextOfKinName}
                            onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                            className="border p-3 rounded-lg w-full focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium">Next of Kin Phone Number</label>
                        <input
                            type="tel"
                            value={formData.nextOfKinPhone}
                            onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                            className="border p-3 rounded-lg w-full focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white p-3 rounded-lg font-semibold hover:opacity-90 transition"
                    >
                        Book Appointment
                    </button>
                </form>
            </div>
        </div>
    );
}
