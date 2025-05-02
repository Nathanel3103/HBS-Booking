import { useState, useEffect } from "react";

const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = new Date(2000, 0, 1, hour, minute);
      times.push(time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }));
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  return (hours % 12) * 60 + minutes + (period === 'PM' ? 720 : 0);
};

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
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      alert("Failed to load doctors");
    }
  };

  const validateWorkingHours = () => {
    return newDoctor.workingHours.every(hour => 
      validDays.includes(hour.day) &&
      hour.startTime &&
      hour.endTime &&
      toMinutes(hour.endTime) > toMinutes(hour.startTime)
    );
  };

  const validateSlots = () => {
    const slots = newDoctor.availableSlots.split(',').map(s => s.trim());
    return slots.every(slot => {
      const [start, end] = slot.split(' - ');
      return start && end && toMinutes(end) > toMinutes(start);
    });
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.name || !newDoctor.specialization || !newDoctor.availableSlots) {
      alert("Please fill in all required fields");
      return;
    }

    if (!validateWorkingHours()) {
      alert("Invalid working hours configuration");
      return;
    }

    if (!validateSlots()) {
      alert("Invalid available slots format");
      return;
    }

    try {
      const res = await fetch("../api/doctors", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newDoctor,
          availableSlots: newDoctor.availableSlots.split(',').map(s => s.trim()),
          workingHours: newDoctor.workingHours
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
        const error = await res.json();
        alert(error.error || "Failed to add doctor");
      }
    } catch (error) {
      console.error("Error adding doctor:", error);
      alert("Failed to connect to server");
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;

    try {
      const res = await fetch("../api/admin/delete-doctor", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        alert("Doctor deleted successfully!");
        fetchDoctors();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete doctor");
      }
    } catch (error) {
      console.error("Error deleting doctor:", error);
      alert("Failed to connect to server");
    }
  };

  const handleWorkingHoursChange = (index, field, value) => {
    const updatedHours = [...newDoctor.workingHours];
    updatedHours[index][field] = value;
    
    if (field === 'startTime') {
      const start = toMinutes(value);
      const currentEnd = toMinutes(updatedHours[index].endTime);
      if (currentEnd <= start) {
        updatedHours[index].endTime = '';
      }
    }
    
    setNewDoctor({ ...newDoctor, workingHours: updatedHours });
  };

  const addWorkingHourField = () => {
    setNewDoctor(prev => ({
      ...prev,
      workingHours: [...prev.workingHours, { day: "", startTime: "", endTime: "" }]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Manage Doctors
      </h1>

      {/* Add Doctor Form */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Add New Doctor
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Doctor's Name"
            value={newDoctor.name}
            onChange={(e) => setNewDoctor({...newDoctor, name: e.target.value})}
            className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          
          <input
            type="text"
            placeholder="Specialization"
            value={newDoctor.specialization}
            onChange={(e) => setNewDoctor({...newDoctor, specialization: e.target.value})}
            className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Available Slots (e.g., 08:00 AM - 08:30 AM, 09:00 AM - 09:30 AM)"
              value={newDoctor.availableSlots}
              onChange={(e) => setNewDoctor({...newDoctor, availableSlots: e.target.value})}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-sm text-gray-500 mt-1">
              Use format HH:MM AM/PM - HH:MM AM/PM, comma-separated
            </p>
          </div>
        </div>

        {/* Working Hours Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Working Hours</h3>
          {newDoctor.workingHours.map((hour, index) => (
            <div key={index} className="grid grid-cols-3 gap-4 mb-3">
              <select
                value={hour.day}
                onChange={(e) => handleWorkingHoursChange(index, 'day', e.target.value)}
                className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Day</option>
                {validDays.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>

              <select
                value={hour.startTime}
                onChange={(e) => handleWorkingHoursChange(index, 'startTime', e.target.value)}
                className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Start Time</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>

              <select
                value={hour.endTime}
                onChange={(e) => handleWorkingHoursChange(index, 'endTime', e.target.value)}
                className="border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={!hour.startTime}
              >
                <option value="">End Time</option>
                {timeOptions
                  .filter(time => toMinutes(time) > toMinutes(hour.startTime))
                  .map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
              </select>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addWorkingHourField}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add Working Hour
          </button>
        </div>

        <button
          onClick={handleAddDoctor}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
        >
          Add Doctor
        </button>
      </div>

      {/* Doctors List */}
      <div className="space-y-4">
        {doctors.length === 0 ? (
          <p className="text-center text-gray-500">No doctors available</p>
        ) : (
          doctors.map(doctor => (
            <div
              key={doctor._id}
              className="bg-gray-50 p-4 rounded-lg shadow flex justify-between items-center border"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {doctor.name} - {doctor.specialization}
                </h3>
                <p className="text-gray-600 mt-2">
                  Available Slots: {doctor.availableSlots.join(', ')}
                </p>
                <div className="mt-2">
                  <p className="text-gray-600 font-medium">Working Hours:</p>
                  <ul className="list-disc list-inside">
                    {doctor.workingHours.map((hour, idx) => (
                      <li key={idx} className="text-gray-600">
                        {hour.day}: {hour.startTime} - {hour.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => handleDeleteDoctor(doctor._id)}
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
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