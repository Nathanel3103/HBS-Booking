import { useState, useEffect } from "react";
import axios from "axios";

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [message, setMessage] = useState("");


  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
  try {
    const [webRes, waRes] = await Promise.all([
      axios.get("/api/appointments"),
      axios.get("/api/whatsapp-appointments")
    ]);

    // Normalize Web appointments
    const webAppointments = webRes.data.map(appt => ({
      _id: appt._id,
      patient: appt.userId?.name || appt.patientDetails?.firstName || "Unknown",
      doctor: appt.doctor?.name || "Unknown",
      date: appt.date,
      time: appt.time,
      source: appt.source || "Web"
    }));

    // Normalize WhatsApp appointments
    const whatsappAppointments = waRes.data.map(appt => ({
      _id: appt._id,
      patient: appt.patientName || "Unknown",
      doctor: appt.doctor?.name || "Unknown",
      date: appt.date,
      time: appt.time,
      source: appt.source || "WhatsApp"
    }));

    setAppointments([...webAppointments, ...whatsappAppointments]);
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

  // Filter appointments by source
  const filteredUpcoming = upcomingAppointments.filter(
    (appt) =>
      sourceFilter === "all" || appt.source === sourceFilter
  );
  const filteredPast = pastAppointments.filter(
    (appt) =>
      sourceFilter === "all" || appt.source === sourceFilter
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
        >
          {loading ? "Sending..." : "Notify Patients"}
        </button>

        {/* Source Filter */}

        <select
  value={sourceFilter}
  onChange={(e) => setSourceFilter(e.target.value)}
  className="ml-3 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-800 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
    hover:bg-gray-50 transition h-12
  "
>
  <option value="all">All Sources</option>
  <option value="Web">Web</option>
  <option value="WhatsApp">WhatsApp</option>
</select>

        <h3 className="text-xl font-semibold mb-4 text-gray-800">Upcoming Appointments</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 border border-gray-300 text-left">Patient</th>
                <th className="p-3 border border-gray-300 text-left">Doctor</th>
                <th className="p-3 border border-gray-300 text-left">Date</th>
                <th className="p-3 border border-gray-300 text-left">Timeslot</th>
              </tr>
            </thead>
            <tbody>
              {filteredUpcoming.length > 0 ? (
                filteredUpcoming.map((appt) => (
                  <tr key={appt._id} className="border-b border-gray-200 hover:bg-gray-100 transition duration-200">
                    <td className="p-3 border border-gray-300">{appt.patient}</td>
                    <td className="p-3 border border-gray-300">{appt.doctor}</td>
                    <td className="p-3 border border-gray-300">{(() => {
  if (appt.date && /^\d{4}-\d{2}-\d{2}$/.test(appt.date)) {
    // If date is in YYYY-MM-DD, display as-is to avoid timezone issues
    return appt.date;
  } else if (appt.date) {
    return `${new Date(appt.date).getFullYear()}-${String(new Date(appt.date).getMonth() + 1).padStart(2, '0')}-${String(new Date(appt.date).getDate()).padStart(2, '0')}`;
  } else {
    return '';
  }
})()}</td>
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
                <th className="p-3 border border-gray-300 text-left">Timeslot</th>
              </tr>
            </thead>
            <tbody>
              {filteredPast.length > 0 ? (
                filteredPast.map((appt) => (
                  <tr key={appt._id} className="border-b border-gray-200 hover:bg-gray-100 transition duration-200">
                    <td className="p-3 border border-gray-300">{appt.patient}</td>
                    <td className="p-3 border border-gray-300">{appt.doctor}</td>
                    <td className="p-3 border border-gray-300">{(() => {
  if (appt.date && /^\d{4}-\d{2}-\d{2}$/.test(appt.date)) {
    // If date is in YYYY-MM-DD, display as-is to avoid timezone issues
    return appt.date;
  } else if (appt.date) {
    return `${new Date(appt.date).getFullYear()}-${String(new Date(appt.date).getMonth() + 1).padStart(2, '0')}-${String(new Date(appt.date).getDate()).padStart(2, '0')}`;
  } else {
    return '';
  }
})()}</td>
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
