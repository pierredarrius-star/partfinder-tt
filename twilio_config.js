const twilio = require('twilio');

const accountSid = 'ACb5db8c7671a05748424fb6e8a9c90548';
const authToken = 'b893db93738bae3142f7b4cd2a8b479c';
const phoneNumber = '+17015435440';
const webhookUrl = 'https://cyano-wanita-mediaeval.ngrok-free.dev/api/webhook/voice';

const client = twilio(accountSid, authToken);

async function configureNumber() {
  try {
    // 1. Find the SID for the matching number
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber,
      limit: 1
    });

    if (incomingPhoneNumbers.length === 0) {
      console.error(`Could not find Twilio number: ${phoneNumber}`);
      process.exit(1);
    }

    const sid = incomingPhoneNumbers[0].sid;
    console.log(`Found Phone Number SID: ${sid}`);

    // 2. Update the VoiceUrl
    await client.incomingPhoneNumbers(sid).update({
      voiceUrl: webhookUrl,
      voiceMethod: 'POST'
    });

    console.log(`Successfully updated Voice Webhook to: ${webhookUrl}`);
  } catch (error) {
    console.error('Error configuring Twilio number:', error.message);
    process.exit(1);
  }
}

configureNumber();
