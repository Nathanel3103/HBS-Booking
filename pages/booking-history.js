import { useEffect, useState } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import { useRouter } from "next/router";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editedData, setEditedData] = useState({});
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (!storedUser || !storedUser.id) {
          setError("User not found. Please log in again.");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/bookings?userId=${storedUser.id}`, {
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Failed to fetch bookings.");
        }

        setBookings(result.data || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        setError(error.message);
      }

      setLoading(false);
    };

    fetchBookings();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this booking?")) return;

    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Delete error response:", errorData);
        throw new Error(errorData.error || "Failed to delete booking.");
      }

      setBookings((prev) => prev.filter((booking) => booking._id !== id));
    } catch (error) {
      console.error("Error deleting booking:", error);
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking._id);
    setEditedData({
      date: booking.date,
      time: booking.time,
      description: booking.description || "",
    });
  };

  const handleChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const handleSave = async (id) => {
    try {
      console.log("Saving edited data:", editedData);
  
      const res = await fetch('/api/bookings/${id}', {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedData),
      });
  
      if (!res.ok) {
        console.error("Update error response:", res);
        const errorData = await res.json();
        console.error("Error details:", errorData);
        throw new Error(errorData.error || "Failed to update booking.");
      }
  
      const updatedBooking = await res.json();
      console.log("Updated Booking:", updatedBooking);
  
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === id ? { ...booking, ...updatedBooking } : booking
        )
      );
  
      setEditingBooking(null);
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking: " +error.message);
    }
  };
    
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/patient-dashboard")}
          className="mb-6 flex items-center text-slate-600 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        <p className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/patient-dashboard")}
            className="flex items-center text-slate-600 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Booking History</h1>
          <p className="mt-1 text-slate-600">View and manage your appointments</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Calendar className="text-slate-400" size={24} />
            </div>
            <p className="text-slate-600 text-lg">No bookings found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-teal-500 transition-all">
                {editingBooking === booking._id ? (
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date
                          <input
                            type="date"
                            name="date"
                            value={editedData.date}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-slate-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Time
                          <input
                            type="time"
                            name="time"
                            value={editedData.time}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-slate-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                        <textarea
                          name="description"
                          value={editedData.description}
                          onChange={handleChange}
                          rows="3"
                          className="mt-1 block w-full rounded-md border-slate-200 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        />
                      </label>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleSave(booking._id)}
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingBooking(null)}
                        className="inline-flex justify-center items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-500">Appointment Type</p>
                        <p className="font-medium text-slate-900">{booking.appointmentType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Doctor</p>
                        <p className="font-medium text-slate-900">{booking.doctor?.name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="font-medium text-slate-900">{booking.date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Time</p>
                        <p className="font-medium text-slate-900">{booking.time}</p>
                      </div>
                    </div>
                    {booking.description && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-500">Description</p>
                        <p className="text-slate-900">{booking.description}</p>
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEdit(booking)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                      >
                        Edit Appointment
                      </button>
                      <button
                        onClick={() => handleDelete(booking._id)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}