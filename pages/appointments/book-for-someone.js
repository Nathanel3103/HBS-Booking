import { useState, useEffect } from "react";

export default function BookForSomeoneElse() {
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        dob: "",
        gender: "",
        maritalStatus: "",
        employmentStatus: "",
        phoneNumber: "",
        email: "",
        streetAddress: "",
        city: "",
        relationToOwner: "",
        nextOfKin: {
            firstName: "",
            lastName: "",
            relationship: "",
            email: "",
            phoneNumber: "",
            streetAddress: "",
        },
        appointment: {
            date: "",
            time: "",
            doctor: "",
            description: "",
        },
    });

    useEffect(() => {
        const storedDoctors = JSON.parse(localStorage.getItem("doctors")) || [];
        setDoctors(storedDoctors);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNextOfKinChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            nextOfKin: {
                ...prev.nextOfKin,
                [name]: value,
            },
        }));
    };

    const handleAppointmentChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            appointment: {
                ...prev.appointment,
                [name]: value,
            },
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Appointment Booked Successfully for Someone Else!");
        console.log(formData);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Book an Appointment for Someone Else</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Patient Information */}
                <h2 className="text-lg font-semibold">Patient Information</h2>
                <input type="text" name="firstName" placeholder="First Name" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="text" name="lastName" placeholder="Last Name" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="date" name="dob" onChange={handleChange} required className="border p-2 rounded w-full" />
                
                <div>
                    <label>Gender:</label>
                    <input type="radio" name="gender" value="Male" onChange={handleChange} required /> Male
                    <input type="radio" name="gender" value="Female" onChange={handleChange} required /> Female
                    <input type="radio" name="gender" value="Other" onChange={handleChange} required /> Other
                </div>

                <input type="text" name="maritalStatus" placeholder="Marital Status" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="text" name="employmentStatus" placeholder="Employment Status" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="tel" name="phoneNumber" placeholder="Phone Number" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="text" name="streetAddress" placeholder="Street Address" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="text" name="city" placeholder="City" onChange={handleChange} required className="border p-2 rounded w-full" />
                <input type="text" name="relationToOwner" placeholder="Relation to Account Owner" onChange={handleChange} required className="border p-2 rounded w-full" />

                {/* Next of Kin Information */}
                <h2 className="text-lg font-semibold">Next of Kin (Optional)</h2>
                <input type="text" name="firstName" placeholder="First Name" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />
                <input type="text" name="lastName" placeholder="Last Name" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />
                <input type="text" name="relationship" placeholder="Relationship to Patient" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />
                <input type="email" name="email" placeholder="Next of Kin Email" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />
                <input type="tel" name="phoneNumber" placeholder="Next of Kin Phone Number" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />
                <input type="text" name="streetAddress" placeholder="Next of Kin Street Address" onChange={handleNextOfKinChange} className="border p-2 rounded w-full" />

                {/* Appointment Details */}
                <h2 className="text-lg font-semibold">Booking Details</h2>
                <input type="date" name="date" onChange={handleAppointmentChange} required className="border p-2 rounded w-full" />
                <input type="time" name="time" onChange={handleAppointmentChange} required className="border p-2 rounded w-full" />
                
                <select name="doctor" onChange={handleAppointmentChange} required className="border p-2 rounded w-full">
                    <option value="">Select a Doctor</option>
                    {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.name}>
                            {doctor.name} ({doctor.specialty})
                        </option>
                    ))}
                </select>

                <textarea name="description" placeholder="Description of Visit" onChange={handleAppointmentChange} required className="border p-2 rounded w-full" />

                <button type="submit" className="w-full bg-yellow-500 text-white p-2 rounded">
                    Book Appointment
                </button>
            </form>
        </div>
    );
}
