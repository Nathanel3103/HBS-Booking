import cron from "node-cron";
import { sendReminders } from "./pages/sendReminders.js";

cron.schedule("0 0-40 16 * * ?", () => {
  console.log("Running SMS reminder job...");
  sendReminders();
});
