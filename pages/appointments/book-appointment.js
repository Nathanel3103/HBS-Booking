'use client';

import { useEffect, useState } from 'react';
import { Calendar } from '../../components/ui/calendar';
import { Card } from '../../components/ui/card';
import { Avatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Calendar as CalendarIcon, Clock, Stethoscope, User } from 'lucide-react';

export default function Home() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedTime) {
      alert("Please select a doctor and a time slot.");
      return;
    }
  
    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":");
    appointmentDateTime.setHours(hours, minutes, 0, 0); // Set selected time
    const user = JSON.parse(localStorage.getItem("user"));
  
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          doctorId: selectedDoctor._id,
          appointmentDateTime,
        }),
      });
  
      const data = await response.json();
      if (response.ok) {
        alert("Appointment booked successfully!");
      } else {
        alert(data.error || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // List of random doctor images
  const doctorImages = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&h=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&h=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1594824476967-e4aa1f52f147?q=80&w=200&h=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584516150909-c43483ee7932?q=80&w=200&h=200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1527613426441-4da17471b66d?q=80&w=200&h=200&auto=format&fit=crop',
  ];

  // Fetch doctors from the API
  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await fetch('/api/doctors');
        const data = await res.json();
        const doctorsWithImages = data.map((doctor, index) => ({
          ...doctor,
          imageUrl: doctorImages[index % doctorImages.length], // Assign random image
        }));
        setDoctors(doctorsWithImages);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    }
    fetchDoctors();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Book Your Appointment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Doctor List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              Available Doctors
            </h2>
            {doctors.length > 0 ? (
              doctors.map((doctor) => (
                <Card
                  key={doctor._id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedDoctor?._id === doctor._id ? 'ring-2 ring-primary' : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <img src={doctor.imageUrl} alt={doctor.name} className="object-cover" />
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Stethoscope className="w-4 h-4" />
                        {doctor.specialization}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-gray-500">No doctors available.</p>
            )}
          </div>

          {/* Calendar */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </h2>
            <Card className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </Card>
          </div>

          {/* Time Slots */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Available Time Slots
            </h2>
            <Card className="p-4">
              {selectedDoctor ? (
                <div className="grid grid-cols-2 gap-2">
                  {selectedDoctor.availableSlots.length > 0 ? (
                    selectedDoctor.availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </Button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No available slots</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Please select a doctor to view available time slots
                </p>
              )}
              {selectedDoctor && selectedTime && (
                <Button className="w-full mt-4" onClick={handleBookAppointment}>
                Book Appointment
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
