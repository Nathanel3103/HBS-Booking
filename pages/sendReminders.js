import { useState } from 'react';

export default function SendReminders() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSendReminders = async () => {
    try {
      setStatus('Sending reminders...');
      const res = await fetch("/api/send-reminders", {
        method: "POST",
      });

      const data = await res.json();
      setStatus('Reminders sent successfully!');
      console.log("Reminder Response:", data);
    } catch (error) {
      console.error("Failed to send reminders:", error);
      setError('Failed to send reminders. Please try again.');
      setStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Send Appointment Reminders</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <button
            onClick={handleSendReminders}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={status === 'Sending reminders...'}
          >
            {status === 'Sending reminders...' ? 'Sending...' : 'Send Reminders'}
          </button>

          {status && (
            <p className="mt-4 text-green-600">{status}</p>
          )}

          {error && (
            <p className="mt-4 text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
