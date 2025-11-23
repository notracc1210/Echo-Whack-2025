# ElevenLabs Text-to-Speech Setup Guide

This guide will help you set up ElevenLabs API for high-quality voiceover/text-to-speech functionality in the app.

## Prerequisites

1. An ElevenLabs account (sign up at [elevenlabs.io](https://elevenlabs.io))
2. Node.js installed (v16 or later)
3. npm or yarn package manager

## Step 1: Create an ElevenLabs Account

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up for a free account (includes free tier with 10,000 characters/month)
3. Verify your email address

## Step 2: Get Your API Key

1. Log in to your ElevenLabs account
2. Navigate to your profile/settings
3. Go to the "API Keys" section
4. Click "Create API Key" or copy your existing API key
5. **Important**: Copy and save your API key securely (you won't be able to see it again)

## Step 3: Choose a Voice (Optional)

1. Go to the [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Browse available voices
3. Note the Voice ID of your preferred voice (found in the URL or voice details)
4. Popular default voices:
   - **Default Voice**: `g6xIsTj2HwM6VR4iXFCw` - Current default voice
   - **Rachel**: `21m00Tcm4TlvDq8ikWAM` - Clear, professional female voice
   - **Adam**: `pNInz6obpgDQGcFmaJgB` - Deep male voice
   - **Antoni**: `ErXwobaYiN019PkySvjV` - Warm male voice
   - **Bella**: `EXAVITQu4vr4xnSDxMaL` - Soft female voice

## Step 4: Configure Environment Variables

1. Create or edit the `.env` file in the `server` directory:
   ```bash
   cd server
   ```

2. Add the following to your `server/.env` file:
   ```env
   # ElevenLabs API Key (required)
   ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
   
   # Optional: Custom voice ID (defaults to g6xIsTj2HwM6VR4iXFCw if not set)
   ELEVENLABS_VOICE_ID=g6xIsTj2HwM6VR4iXFCw
   
   # Optional: Model ID (defaults to eleven_turbo_v2 if not set)
   # Available models:
   # - eleven_turbo_v2: Fast, high-quality (recommended)
   # - eleven_multilingual_v2: Multilingual support
   # - eleven_monolingual_v1: Legacy model
   ELEVENLABS_MODEL_ID=eleven_turbo_v2
   ```

3. **Important**: 
   - Never commit the `.env` file to version control
   - Replace `your-elevenlabs-api-key-here` with your actual API key from Step 2
   - The voice ID and model ID are optional - defaults will be used if not specified

## Step 5: Test the Integration

1. Start the backend server:
   ```bash
   cd server
   npm start
   ```

2. Test the text-to-speech endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/text-to-speech \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello, this is a test of ElevenLabs text-to-speech."}'
   ```

3. You should receive a JSON response with base64-encoded audio

4. List available voices:
   ```bash
   curl http://localhost:3001/api/elevenlabs/voices
   ```

## Step 6: Use in Your App

The ElevenLabs integration is already built into the app! When you:

1. Use the voice interface to ask questions
2. Receive AI responses
3. The app automatically plays the response using ElevenLabs TTS

The voiceover functionality is handled by:
- `utils/audioPlayer.ts` - Plays audio using ElevenLabs
- `utils/api.ts` - Calls the backend API
- `server/index.js` - ElevenLabs API integration

## API Endpoints

### POST `/api/text-to-speech`
Generate speech from text using ElevenLabs.

**Request Body:**
```json
{
  "text": "Text to convert to speech",
  "voice_id": "optional-voice-id",
  "model_id": "optional-model-id"
}
```

**Response:**
```json
{
  "audio": "base64-encoded-audio-data",
  "format": "mp3",
  "mimeType": "audio/mpeg"
}
```

### GET `/api/elevenlabs/voices`
List all available voices from your ElevenLabs account.

**Response:**
```json
{
  "voices": [
    {
      "voice_id": "g6xIsTj2HwM6VR4iXFCw",
      "name": "Default Voice",
      "category": "premade",
      ...
    }
  ]
}
```

## Troubleshooting

### "ElevenLabs API key not configured" error
- Make sure you've added `ELEVENLABS_API_KEY` to `server/.env`
- Restart the server after adding the API key
- Check that there are no extra spaces or quotes around the API key

### "Invalid ElevenLabs API key" error (401)
- Verify your API key is correct
- Make sure you copied the entire API key
- Check that your ElevenLabs account is active

### "ElevenLabs API quota exceeded" error (429)
- You've reached your monthly character limit
- Check your usage at [ElevenLabs Dashboard](https://elevenlabs.io/app)
- Upgrade your plan or wait for quota reset
- Free tier: 10,000 characters/month

### "Invalid request" error (422)
- Check that the voice_id exists in your account
- Verify the model_id is valid (use `eleven_turbo_v2` or `eleven_multilingual_v2`)
- Ensure the text is not empty

### Audio not playing in the app
- Check browser console for errors
- Verify the backend server is running
- Check network tab to see if the API call succeeded
- The app falls back to local TTS if ElevenLabs fails

## Voice Settings

You can customize voice settings in `server/index.js`:

```javascript
voice_settings: {
  stability: 0.5,        // 0.0 - 1.0: Lower = more variation
  similarity_boost: 0.75, // 0.0 - 1.0: Higher = more similar to original
  style: 0.0,            // 0.0 - 1.0: Style exaggeration
  use_speaker_boost: true // Enhance clarity
}
```

## Pricing

- **Free Tier**: 10,000 characters/month
- **Starter**: $5/month - 30,000 characters
- **Creator**: $22/month - 100,000 characters
- **Pro**: $99/month - 500,000 characters

See [ElevenLabs Pricing](https://elevenlabs.io/pricing) for current rates.

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- Rotate API keys regularly
- Monitor your usage to avoid unexpected charges
- The API key is only used server-side, never exposed to the client

## Additional Resources

- [ElevenLabs API Documentation](https://elevenlabs.io/docs/api-reference)
- [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
- [ElevenLabs Dashboard](https://elevenlabs.io/app)

