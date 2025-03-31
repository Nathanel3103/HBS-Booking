import { useEffect, useState } from "react";

const NotifiedPatients = () => {
  const [notifiedPatients, setNotifiedPatients] = useState([]);

  useEffect(() => {
    const fetchNotifiedPatients = async () => {
      try {
        const response = await fetch("/api/notified-patients");
        const data = await response.json();
        setNotifiedPatients(data);
      } catch (error) {
        console.error("Error fetching notified patients:", error);
      }
    };

    fetchNotifiedPatients();
  }, []);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Notified Patients</h2>
      {notifiedPatients.length === 0 ? (
        <p>No notifications sent yet.</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Phone</th>
              <th className="border p-2">Doctor</th>
              <th className="border p-2">Appointment Date</th>
              <th className="border p-2">Description</th>
              <th className="border p-2">Notified At</th>
            </tr>
          </thead>
          <tbody>
            {notifiedPatients.map((patient) => (
              <tr key={patient._id} className="text-center border-t">
                <td className="border p-2">{patient.name}</td>
                <td className="border p-2">{patient.phoneNumber}</td>
                <td className="border p-2">{patient.doctorName}</td>
                <td className="border p-2">{new Date(patient.appointmentDate).toLocaleDateString()}</td>
                <td className="border p-2">{patient.description || "N/A"}</td>
                <td className="border p-2">{new Date(patient.notifiedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default NotifiedPatients;
