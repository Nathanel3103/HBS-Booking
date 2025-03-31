import { useState } from "react";

export default function VaccinationBooking() {
    const [formData, setFormData] = useState({
        date: "",
        time: "",
        vaccineType: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
    });

    const vaccineOptions = [
        "COVID-19 vaccine",
        "Chickenpox vaccine",
        "Flu vaccine",
        "Hepatitis B vaccine",
        "Meningococcal vaccine",
        "Meningitidis",
        "MMR vaccine",
        "Tdap",
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Vaccination Appointment Booked Successfully!");
        console.log(formData);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Vaccination Booking</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Appointment Details */}
                <label className="block">
                    <span className="text-gray-700">Date of Appointment</span>
                    <input type="date" name="date" onChange={handleChange} required className="border p-2 rounded w-full" />
                </label>

                <label className="block">
                    <span className="text-gray-700">Time of Appointment</span>
                    <input type="time" name="time" onChange={handleChange} required className="border p-2 rounded w-full" />
                </label>

                <label className="block">
                    <span className="text-gray-700">Type of Vaccination</span>
                    <select name="vaccineType" onChange={handleChange} required className="border p-2 rounded w-full">
                        <option value="">Select a Vaccine</option>
                        {vaccineOptions.map((vaccine, index) => (
                            <option key={index} value={vaccine}>
                                {vaccine}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Next of Kin Details */}
                <label className="block">
                    <span className="text-gray-700">Next of Kin Name</span>
                    <input type="text" name="nextOfKinName" placeholder="Enter Next of Kin Name" onChange={handleChange} required className="border p-2 rounded w-full" />
                </label>

                <label className="block">
                    <span className="text-gray-700">Next of Kin Phone Number</span>
                    <input type="tel" name="nextOfKinPhone" placeholder="Enter Next of Kin Phone Number" onChange={handleChange} required className="border p-2 rounded w-full" />
                </label>

                <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
                    Book Vaccination
                </button>
            </form>
        </div>
    );
}
