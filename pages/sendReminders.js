import fetch from "node-fetch";

const sendReminders = async () => {
  try {
    const res = await fetch("http://localhost:3000/api/send-reminders", {
      method: "POST",
    });

    const data = await res.json();
    console.log("Reminder Response:", data);
  } catch (error) {
    console.error("Failed to send reminders:", error);
  }
};

sendReminders();
