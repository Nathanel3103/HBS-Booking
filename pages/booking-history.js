import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Edit, Trash2 } from "lucide-react";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editedData, setEditedData] = useState({});

  // Add time formatting function
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // If time is in UTC format (contains Z)
    if (timeString.includes('Z')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // If time is in HH:MM format
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    return timeString;
  };

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

        if (!res.ok) {
          let errorMessage;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || `HTTP error ${res.status}`;
          } catch (e) {
            errorMessage = `Failed to fetch bookings. Status: ${res.status}`;
          }
          setError(errorMessage);
          return;
        }

        const result = await res.json();
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
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update booking.");
      }

      const updatedBooking = await res.json();
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === id ? { ...booking, ...updatedBooking } : booking
        )
      );

      setEditingBooking(null);
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/patient-dashboard" className="flex items-center group">
              <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-teal-600 transition-colors duration-200 group-hover:-translate-x-1" />
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
              Booking History
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <p className="text-slate-600">No bookings found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {editingBooking === booking._id ? (
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={editedData.date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Timeslot
                      </label>
                      <input
                        type="time"
                        name="time"
                        value={editedData.time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={editedData.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Enter appointment description..."
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleSave(booking._id)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Edit size={16} />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingBooking(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">Appointment Type</p>
                        <p className="font-medium text-slate-900">{booking.appointmentType}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">Doctor</p>
                        <p className="font-medium text-slate-900">
                          {booking.doctor?.name || "Dr. " + (booking.doctor?.specialization || "Unknown")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="font-medium text-slate-900">
                          {(() => {
  if (booking.date && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    // Create date in local timezone to avoid UTC conversion issues
    const [year, month, day] = booking.date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString();
  } else if (booking.date) {
    return `${new Date(booking.date).getFullYear()}-${String(new Date(booking.date).getMonth() + 1).padStart(2, '0')}-${String(new Date(booking.date).getDate()).padStart(2, '0')}`;
  } else {
    return '';
  }
})()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">Time</p>
                        <p className="font-medium text-slate-900">
                          {formatTime(booking.time)}
                        </p>
                      </div>
                      {booking.description && (
                        <div className="col-span-2 space-y-2">
                          <p className="text-sm text-slate-500">Description</p>
                          <p className="text-slate-900">{booking.description}</p>
                        </div>
                      )}
                      {booking.nextOfKin?.name && (
                        <div className="col-span-2 space-y-2">
                          <p className="text-sm text-slate-500">Next of Kin</p>
                          <p className="text-slate-900">
                            {booking.nextOfKin.name} ({booking.nextOfKin.phone})
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={() => handleEdit(booking)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(booking._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Trash2 size={16} />
                        <span>Cancel Appointment</span>
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