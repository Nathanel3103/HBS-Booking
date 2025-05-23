import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SMS_SID;
const authToken = process.env.TWILIO_AUTH_SMS_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_SMS_NUMBER;

const client = twilio(accountSid, authToken);

export const sendSms = async (to, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to, 
    });
    console.log("SMS sent successfully:", response.sid);
    return response;
  } catch (error) {
    console.error("Error sending SMS:", {
      message: error.message,
      stack: error.stack,
      statusCode: error.status,
      code: error.code
    });
    throw error; // Re-throw to preserve original error
  }
};
