import { useState, useEffect } from "react";

export default function ManageDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [newDoctor, setNewDoctor] = useState({
        name: "",
        specialization: "",
        availableSlots: "",
        workingHours: [{ day: "", startTime: "", endTime: "" }],
    });

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const res = await fetch("../api/doctors");
            const data = await res.json();
            setDoctors(data);
        } catch (error) {
            console.error("Error fetching doctors:", error);
        }
    };

    const handleAddDoctor = async () => {
        if (!newDoctor.name || !newDoctor.specialization || !newDoctor.availableSlots || newDoctor.workingHours.length === 0) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const res = await fetch("../api/doctors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newDoctor.name,
                    specialization: newDoctor.specialization,
                    availableSlots: newDoctor.availableSlots.split(",").map(slot => slot.trim()),
                    workingHours: newDoctor.workingHours,
                }),
            });

            if (res.ok) {
                alert("Doctor added successfully!");
                setNewDoctor({
                    name: "",
                    specialization: "",
                    availableSlots: "",
                    workingHours: [{ day: "", startTime: "", endTime: "" }],
                });
                fetchDoctors();
            } else {
                alert("Failed to add doctor");
            }
        } catch (error) {
            console.error("Error adding doctor:", error);
        }
    };

    const handleDeleteDoctor = async (id) => {
        if (window.confirm("Are you sure you want to delete this doctor?")) {
            try {
                const res = await fetch("../api/admin/delete-doctor", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                });

                if (res.ok) {
                    alert("Doctor deleted successfully!");
                    fetchDoctors();
                } else {
                    alert("Failed to delete doctor");
                }
            } catch (error) {
                console.error("Error deleting doctor:", error);
            }
        }
    };

    const handleWorkingHoursChange = (index, field, value) => {
        const updatedHours = [...newDoctor.workingHours];
        updatedHours[index][field] = value;
        setNewDoctor({ ...newDoctor, workingHours: updatedHours });
    };

    const addWorkingHourField = () => {
        setNewDoctor({
            ...newDoctor,
            workingHours: [...newDoctor.workingHours, { day: "", startTime: "", endTime: "" }],
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Manage Doctors</h1>

            {/* Add Doctor Form */}
            <div className="bg-gray-100 p-6 rounded-lg mb-6 shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Doctor</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Doctor's Name"
                        value={newDoctor.name}
                        onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                        className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        type="text"
                        placeholder="Specialization"
                        value={newDoctor.specialization}
                        onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                        className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                        type="text"
                        placeholder="Available Slots (comma-separated)"
                        value={newDoctor.availableSlots}
                        onChange={(e) => setNewDoctor({ ...newDoctor, availableSlots: e.target.value })}
                        className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* Working Hours Input Fields */}
                <h3 className="mt-4 text-lg font-semibold">Working Hours</h3>
                {newDoctor.workingHours.map((hour, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 mt-2">
                        <input
                            type="text"
                            placeholder="Day (e.g., Monday)"
                            value={hour.day}
                            onChange={(e) => handleWorkingHoursChange(index, "day", e.target.value)}
                            className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <input
                            type="text"
                            placeholder="Start Time (e.g., 08:00 AM)"
                            value={hour.startTime}
                            onChange={(e) => handleWorkingHoursChange(index, "startTime", e.target.value)}
                            className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <input
                            type="text"
                            placeholder="End Time (e.g., 05:00 PM)"
                            value={hour.endTime}
                            onChange={(e) => handleWorkingHoursChange(index, "endTime", e.target.value)}
                            className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>
                ))}
                <button
                    onClick={addWorkingHourField}
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                    Add Another Working Hour
                </button>

                <button
                    onClick={handleAddDoctor}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg w-full transition duration-200"
                >
                    Add Doctor
                </button>
            </div>

            {/* Display Doctors */}
            <div className="space-y-4">
                {doctors.length === 0 ? (
                    <p className="text-center text-gray-500">No doctors available.</p>
                ) : (
                    doctors.map((doctor) => (
                        <div
                            key={doctor._id}
                            className="bg-gray-50 p-4 rounded-lg shadow flex justify-between items-center border"
                        >
                            <div>
                                <p className="text-lg font-semibold text-gray-800">{doctor.name} - {doctor.specialization}</p>
                                <p className="text-gray-600">Available Slots: {doctor.availableSlots.join(", ")}</p>
                                <p className="text-gray-600">Working Hours:</p>
                                <ul className="text-gray-600">
                                    {doctor.workingHours.map((hour, idx) => (
                                        <li key={idx}>
                                            {hour.day}: {hour.startTime} - {hour.endTime}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <button
                                onClick={() => handleDeleteDoctor(doctor._id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
