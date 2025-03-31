import { useEffect, useState } from "react";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editedData, setEditedData] = useState({});

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
    
  
  if (loading) return <p>Loading booking history...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Booking History</h1>
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking._id} className="border p-4 rounded-lg shadow-md">
              {editingBooking === booking._id ? (
                <>
                  <label>
                    Date:
                    <input
                      type="date"
                      name="date"
                      value={editedData.date}
                      onChange={handleChange}
                      className="border p-2 rounded w-full"
                    />
                  </label>
                  <label>
                    Time:
                    <input
                      type="time"
                      name="time"
                      value={editedData.time}
                      onChange={handleChange}
                      className="border p-2 rounded w-full"
                    />
                  </label>
                  <label>
                    Description:
                    <textarea
                      name="description"
                      value={editedData.description}
                      onChange={handleChange}
                      className="border p-2 rounded w-full"
                    />
                  </label>
                  <button
                    onClick={() => handleSave(booking._id)}
                    className="bg-green-500 text-white p-2 rounded mt-2"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingBooking(null)}
                    className="bg-gray-500 text-white p-2 rounded mt-2 ml-2"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <p><strong>Appointment Type:</strong> {booking.appointmentType}</p>
                  <p><strong>Doctor:</strong> {booking.doctor?.name || "Unknown"}</p>
                  <p><strong>Date:</strong> {booking.date}</p>
                  <p><strong>Time:</strong> {booking.time}</p>
                  {booking.description && <p><strong>Description:</strong> {booking.description}</p>}
                  {booking.nextOfKin?.name && (
                    <p><strong>Next of Kin:</strong> {booking.nextOfKin.name} ({booking.nextOfKin.phone})</p>
                  )}
                  <button
                    onClick={() => handleEdit(booking)}
                    className="bg-blue-500 text-white p-2 rounded mt-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(booking._id)}
                    className="bg-red-500 text-white p-2 rounded mt-2 ml-2"
                  >
                    Cancel Appointment
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}