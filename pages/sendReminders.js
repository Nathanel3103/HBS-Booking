import { useState } from 'react';

export default function SendReminders() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState(null);

  const handleSendReminders = async () => {
    try {
      setStatus('Sending reminders...');
      setError('');
      setDetails(null);
      
      const res = await fetch("/api/send-reminders", {
        method: "POST",
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reminders');
      }
      
      setStatus('Reminders sent successfully!');
      setDetails(data);
      console.log("Reminder Response:", data);
    } catch (error) {
      console.error("Failed to send reminders:", error);

      setError(`Failed to send reminders: ${error.message}`);
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

            <div className="mt-4">
              <p className="text-green-600">{status}</p>
              {details && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p>Sent {details.notifiedPatients?.length || 0} reminders</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
