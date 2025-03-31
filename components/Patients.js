import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [newPatient, setNewPatient] = useState({ name: "", email: "", phoneNumber: "" });
  const [editingPatient, setEditingPatient] = useState(null);
  const [expandedPatient, setExpandedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await axios.get("/api/patients");
      setPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const handleCreate = async () => {
    try {
      const { data } = await axios.post("/api/patients", newPatient);
      setPatients([...patients, data]);
      alert("Patient Created Successfully These are the patient login details \nUsername: " + data.email + "\nPassword: " + data.password);
      setNewPatient({ name: "", email: "", phoneNumber: "", password: "", employmentStatus: "", maritalStatus: "", streetAddress: "", city: "", dateOfBirth: "" });
    } catch (error) {
      console.error("Error creating patient:", error);
    }
  };

  const handleUpdate = async (id, updatedInfo) => {
    try {
      const { data } = await axios.put(`/api/patients/${id}`, updatedInfo);
      setPatients(patients.map((p) => (p._id === id ? data : p)));
    } catch (error) {
      console.error("Error updating patient:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/patients/${id}`);
      setPatients(patients.filter((p) => p._id !== id));
    } catch (error) {
      console.error("Error deleting patient:", error);
    }
  };

  const toggleExpand = (id) => {
    setExpandedPatient(expandedPatient === id ? null : id);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Patients Management</h2>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Create Patient Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">{editingPatient ? "Edit Patient" : "Add New Patient"}</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={editingPatient ? editingPatient.name : newPatient.name}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, name: e.target.value })
                : setNewPatient({ ...newPatient, name: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={editingPatient ? editingPatient.email : newPatient.email}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, email: e.target.value })
                : setNewPatient({ ...newPatient, email: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={editingPatient ? editingPatient.password : newPatient.password}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, password: e.target.value })
                : setNewPatient({ ...newPatient, password: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />

          {/** Date of Birth */}
          <input
            type="date"
            placeholder="Date of Birth"
            value={editingPatient ? editingPatient.dateOfBirth : newPatient.dateOfBirth}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, dateOfBirth: e.target.value })
                : setNewPatient({ ...newPatient, dateOfBirth: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />

          {/** Patient Gender */}
          <select
            value={editingPatient ? editingPatient.gender : newPatient.gender}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, gender: e.target.value })
                : setNewPatient({ ...newPatient, gender: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          
          {/** Patient Marital Status */}
          <select
            value={editingPatient ? editingPatient.maritalStatus : newPatient.maritalStatus}
            onChange={(e) =>
                editingPatient
                ? setEditingPatient({ ...editingPatient, maritalStatus: e.target.value })
                : setNewPatient({ ...newPatient, maritalStatus: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          >
            <option value="">Select Marital Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
          <option value="Registered Partnership">Registered Partnership</option>
          <option value="Living Common Law">Living Common Law</option>
          </select>
        
          {/** Employment status*/}
        <select
            value={editingPatient ? editingPatient.employmentStatus : newPatient.employmentStatus}
            onChange={(e) =>
                editingPatient
                  ? setEditingPatient({ ...editingPatient, employmentStatus: e.target.value })
                  : setNewPatient({ ...newPatient, employmentStatus: e.target.value })
              }
            className="p-2 border border-gray-300 rounded"
          >
            <option value="">Select Employment Status</option>
          <option value="Employed">Employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Other">Other</option>
          </select>

              {/**  Phone number*/}
          <input
            type="text"
            placeholder="Phone Number"
            value={editingPatient ? editingPatient.phoneNumber : newPatient.phoneNumber}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, phoneNumber: e.target.value })
                : setNewPatient({ ...newPatient, phoneNumber: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />

          {/**street address */}
          <input
            type="text"
            placeholder="Street Address"
            value={editingPatient ? editingPatient.streetAddress : newPatient.streetAddress}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, streetAddress: e.target.value })
                : setNewPatient({ ...newPatient, streetAddress: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />

          {/**City */}
          <input
            type="text"
            placeholder="City"
            value={editingPatient ? editingPatient.city : newPatient.city}
            onChange={(e) =>
              editingPatient
                ? setEditingPatient({ ...editingPatient, city: e.target.value })
                : setNewPatient({ ...newPatient, city: e.target.value })
            }
            className="p-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={editingPatient ? handleUpdate : handleCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300 mt-4"
        >
          {editingPatient ? "Update Patient" : "Add Patient"}
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">All Patients</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 border border-gray-300 text-left">Full Name</th>
                <th className="p-3 border border-gray-300 text-left">Email</th>
                <th className="p-3 border border-gray-300 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients
                .filter((patient) =>
                  `${patient.name} ${patient.email}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
                )
                .map((patient) => (
                  <React.Fragment key={patient._id}>
                    <tr className="border-b border-gray-200">
                      <td className="p-3 border border-gray-300">{patient.name}</td>
                      <td className="p-3 border border-gray-300">{patient.email}</td>
                      <td className="p-3 border border-gray-300 text-center">
                        <button
                          onClick={() => toggleExpand(patient._id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition duration-300"
                        >
                          {expandedPatient === patient._id ? "Collapse" : "Expand"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedPatient === patient._id && (
                      <tr>
                        <td colSpan="3" className="p-4 bg-gray-100 border border-gray-300">
                          <div className="grid grid-cols-2 gap-4">
                            <p><strong>Phone:</strong> {patient.phoneNumber}</p>
                            <p><strong>Date of Birth:</strong> {patient.dateOfBirth}</p>
                            <p><strong>Gender:</strong> {patient.gender}</p>
                            <p><strong>Marital Status:</strong> {patient.maritalStatus}</p>
                            <p><strong>Employment:</strong> {patient.employmentStatus}</p>
                            <p><strong>Address:</strong> {patient.streetAddress}, {patient.city}</p>
                          </div>
                          <div className="mt-4 space-x-3">
                            <button
                              onClick={() => handleUpdate(patient._id, { phoneNumber: "UpdatedPhone" })}
                              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition duration-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(patient._id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
