import { useState, useEffect } from "react";

export default function SpecialistVisit() {
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        date: "",
        time: "",
        doctor: "",
        description: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
    });

    useEffect(() => {
        const storedDoctors = JSON.parse(localStorage.getItem("doctors")) || [];
        setDoctors(storedDoctors);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Specialist Visit Booked Successfully!");
        console.log(formData);
    };

    return (
        <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Specialist Visit Booking</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                    <span>Date of Appointment</span>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span>Time of Appointment</span>
                    <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span>Doctor</span>
                    <select
                        value={formData.doctor}
                        onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    >
                        <option value="">Select a Specialist</option>
                        {doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.name}>
                                {doctor.name} ({doctor.specialty})
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block">
                    <span>Description of Visit</span>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span>Next of Kin Name</span>
                    <input
                        type="text"
                        value={formData.nextOfKinName}
                        onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    />
                </label>

                <label className="block">
                    <span>Next of Kin Phone Number</span>
                    <input
                        type="tel"
                        value={formData.nextOfKinPhone}
                        onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                        className="border p-2 rounded w-full"
                        required
                    />
                </label>

                <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
                    Book Specialist Visit
                </button>
            </form>
        </div>
    );
}
