# Twilio Missed Call Automation Setup

This guide explains how to set up Twilio webhook support for missed-call text-back functionality.

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Phone Number**: Purchase a Twilio phone number
3. **Environment Variables**: Configure the following in your `.env` file

## Environment Variables

Add these to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Internal API Key (for webhook security)
INTERNAL_API_KEY=your_secure_random_key_here
```

## Database Setup

Run the SQL migration to add Twilio fields to user_settings:

```sql
-- Run add_twilio_fields_to_user_settings.sql
```

## Twilio Configuration

### 1. Get Your Credentials

1. Log into your Twilio Console
2. Go to Account → API Keys & Tokens
3. Copy your Account SID and Auth Token

### 2. Purchase a Phone Number

1. Go to Phone Numbers → Manage → Buy a number
2. Choose a number with SMS capabilities
3. Copy the phone number (format: +1234567890)

### 3. Configure Webhook

1. Go to Phone Numbers → Manage → Active numbers
2. Click on your purchased number
3. In the "Messaging" section, set:
   - **Webhook URL**: `https://yourdomain.com/api/twilio/incoming-call`
   - **HTTP Method**: POST
4. Save the configuration

## How It Works

### Missed Call Flow

1. **Customer calls** your Twilio number
2. **Call goes unanswered** (no-answer status)
3. **Twilio sends webhook** to `/api/twilio/incoming-call`
4. **System creates lead** with source='MissedCall'
5. **AI generates SMS** using Ollama
6. **SMS sent to caller** via Twilio
7. **Alert sent to you** with caller info
8. **Activity logged** in automation_runs table

### Profile Configuration

1. Go to **Profile** page in your app
2. Enable **"Missed Call Automation"**
3. Enter your **Twilio phone number**
4. Enter your **business phone** for alerts
5. Copy the **webhook URL** to Twilio settings

## Testing

### Test the Webhook

You can test the webhook using curl:

```bash
curl -X POST https://yourdomain.com/api/twilio/incoming-call \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&CallStatus=no-answer&From=+15551234567&To=+15559876543"
```

### Test with Real Call

1. Call your Twilio number
2. Let it ring until it goes to voicemail
3. Check your business phone for alert SMS
4. Check the caller's phone for AI-generated response
5. Verify lead was created in your dashboard

## Troubleshooting

### Common Issues

1. **Webhook not receiving calls**
   - Check Twilio webhook URL is correct
   - Ensure your app is deployed and accessible
   - Check Twilio logs in console

2. **SMS not sending**
   - Verify Twilio credentials are correct
   - Check phone number format (+1234567890)
   - Ensure Twilio account has SMS credits

3. **AI response not generating**
   - Check Ollama is running locally
   - Verify Ollama API is accessible
   - Check server logs for errors

### Logs

Check these locations for debugging:

- **Twilio Console**: Phone Numbers → Logs
- **App Logs**: Check your deployment logs
- **Database**: Check `automation_runs` and `automation_run_details` tables

## Security

- **Webhook Security**: Consider adding webhook signature verification
- **Rate Limiting**: Implement rate limiting for webhook endpoints
- **Phone Validation**: Validate phone numbers before processing

## Cost Considerations

- **Twilio SMS**: ~$0.0075 per SMS sent
- **Twilio Phone**: ~$1/month per phone number
- **Webhook Calls**: Free (included in phone number cost)

## Support

For issues with:
- **Twilio**: Check [Twilio Support](https://support.twilio.com)
- **App Integration**: Check server logs and database
- **AI Generation**: Verify Ollama is running and accessible
