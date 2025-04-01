# WhatsApp Healthcare Booking System

A robust WhatsApp chatbot system for healthcare appointment booking, built with Next.js, Twilio, and MongoDB.

## Features

- 🤖 Automated appointment booking through WhatsApp
- 📅 Real-time availability checking
- 👨‍⚕️ Doctor selection based on service and availability
- ⏰ Time slot management
- 🔄 Session management with timeout
- 🔒 Secure webhook handling with Twilio signature validation
- 📊 Rate limiting to prevent abuse
- 🗄️ MongoDB integration for data persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- Twilio account with WhatsApp capabilities
- Ngrok or similar tool for local development

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Webhook Configuration
WEBHOOK_URL=your_webhook_url
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hbs-master
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables as described above.

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
lib/whatsapp/
├── config.js         # Configuration and environment variables
├── chatbot.js        # Main chatbot logic and conversation flow
├── availability.js   # Availability checking and slot management
├── utils.js          # Utility functions and helpers
└── README.md         # This file
```

## Conversation Flow

1. **Service Selection**
   - User selects from available services (1-4)
   - Services include: General Check-up, Specialist Visit, Vaccination, Emergency Care

2. **Date Selection**
   - User enters preferred date in DD/MM format
   - System validates date and checks availability

3. **Time Selection**
   - System displays available time slots
   - User selects preferred time slot

4. **Doctor Selection**
   - System shows available doctors for selected service and time
   - User selects preferred doctor

5. **Confirmation**
   - System shows appointment summary
   - User confirms or cancels the booking

## Security Features

- Twilio signature validation for webhook requests
- Rate limiting (100 requests per 15 minutes)
- Environment variable validation
- Secure database connection handling
- Session timeout after 30 minutes of inactivity

## Error Handling

The system includes comprehensive error handling for:
- Invalid date formats
- Unavailable time slots
- No available doctors
- Database connection issues
- Rate limiting
- Missing required fields
- System errors

## Database Collections

- `chat_states`: Stores active conversation states
- `appointments`: Stores confirmed appointments
- `doctors`: Stores doctor information
- `schedules`: Stores doctor schedules and availability

## Development

### Local Testing

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start ngrok:
```bash
ngrok http 3000
```

3. Update your Twilio webhook URL with the ngrok URL:
```
https://your-ngrok-url/api/whatsapp/webhook
```

### Adding New Features

1. Update `config.js` for new configuration options
2. Add new conversation steps in `chatbot.js`
3. Update availability logic in `availability.js` if needed
4. Add new utility functions in `utils.js`

## Production Deployment

1. Set up a production MongoDB instance
2. Configure production environment variables
3. Deploy to a hosting platform (e.g., Vercel, Heroku)
4. Update Twilio webhook URL to production URL
5. Monitor logs for any issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the maintainers. 