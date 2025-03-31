import { useState, useEffect } from "react";
import axios from "axios";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");


  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await axios.get("/api/appointments");
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const notifyPatients = async () => {

    setLoading(true);

    setMessage("");

    try {

      const { data } = await axios.post("/api/send-reminders");

      setMessage(data.message);
      alert("Messages sent successfully");

    } catch (error) {

      setMessage("Failed to send reminders. Please try again.");

      console.error("Error sending reminders:", error);

    }

    setLoading(false);

  };

  const currentDateTime = new Date(); // Get current date and time

  // Separate upcoming and past appointments
  const upcomingAppointments = appointments.filter(
    (appt) => new Date(appt.date) >= currentDateTime
  );

  const pastAppointments = appointments.filter(
    (appt) => new Date(appt.date) < currentDateTime
  );

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Appointments</h2>

      {/* Upcoming Appointments */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        
        {/* Notify Patients Button */}
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-600 transition"
        onClick={notifyPatients}
        disabled={loading}
        >{loading ? "Sending..." : "Notify Patients"}
      </button>

        <h3 className="text-xl font-semibold mb-4 text-gray-800">Upcoming Appointments</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 border border-gray-300 text-left">Patient</th>
                <th className="p-3 border border-gray-300 text-left">Doctor</th>
                <th className="p-3 border border-gray-300 text-left">Date</th>
                <th className="p-3 border border-gray-300 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appt) => (
                  <tr key={appt._id} className="border-b border-gray-200 hover:bg-gray-100 transition duration-200">
                    <td className="p-3 border border-gray-300">{appt.userId?.name || "Unknown"}</td>
                    <td className="p-3 border border-gray-300">{appt.doctor?.name || "Unknown"}</td>
                    <td className="p-3 border border-gray-300">{new Date(appt.date).toLocaleDateString()}</td>
                    <td className="p-3 border border-gray-300">{appt.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">No upcoming appointments.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Past Appointments */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Past Appointments</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 border border-gray-300 text-left">Patient</th>
                <th className="p-3 border border-gray-300 text-left">Doctor</th>
                <th className="p-3 border border-gray-300 text-left">Date</th>
                <th className="p-3 border border-gray-300 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {pastAppointments.length > 0 ? (
                pastAppointments.map((appt) => (
                  <tr key={appt._id} className="border-b border-gray-200 hover:bg-gray-100 transition duration-200">
                    <td className="p-3 border border-gray-300">{appt.userId?.name || "Unknown"}</td>
                    <td className="p-3 border border-gray-300">{appt.doctor?.name || "Unknown"}</td>
                    <td className="p-3 border border-gray-300">{new Date(appt.date).toLocaleDateString()}</td>
                    <td className="p-3 border border-gray-300">{appt.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-500">No past appointments.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
