# How to Change the ElevenLabs Narrator/Voice

You can change the voice used for text-to-speech in two ways:

## Method 1: Change via Environment Variable (Recommended)

1. **Edit the `.env` file** in the `server` directory:
   ```bash
   cd server
   nano .env  # or use your preferred editor
   ```

2. **Add or update the `ELEVENLABS_VOICE_ID`** variable:
   ```env
   ELEVENLABS_VOICE_ID=your-voice-id-here
   ```

3. **Restart the server** for changes to take effect:
   ```bash
   # Stop the current server (Ctrl+C) and restart:
   npm start
   ```

## Method 2: Browse Available Voices

1. **List all available voices** from your ElevenLabs account:
   ```bash
   curl http://localhost:3001/api/elevenlabs/voices | jq '.voices[] | {name: .name, voice_id: .voice_id, description: .description}'
   ```

   Or visit in your browser: `http://localhost:3001/api/elevenlabs/voices`

2. **Find a voice you like** and copy its `voice_id`

3. **Update your `.env` file** with the new voice ID

## Popular Voice Options

Based on your available voices, here are some popular choices:

### Female Voices:
- **Sarah** (`EXAVITQu4vr4xnSDxMaL`) - Professional, confident, warm
- **Laura** (`FGY2WhTYpPnrIDTdsKH5`) - Sunny, enthusiastic, quirky
- **Lily** (`pFZP5JQG7iQjIQuC4Bku`) - British, confident, warm

### Male Voices:
- **Default Voice** (`g6xIsTj2HwM6VR4iXFCw`) - Current default voice
- **Adam** (`pNInz6obpgDQGcFmaJgB`) - Bright, confident, assertive
- **Roger** (`CwhRBWXzGAHq8TQ4Fs17`) - Easy-going, casual conversations
- **George** (`JBFqnCBsd6RMkjVDRZzb`) - British, mature, warm resonance
- **Eric** (`cjVigY5qzO86Huf0OWal`) - Smooth tenor, perfect for agentic use cases
- **Brian** (`nPczCjzI2devNBz1zQrb`) - Resonant, comforting, great for narrations
- **Chris** (`iP95p4xoKVk53GoZ742B`) - Natural, down-to-earth
- **Bill** (`pqHfZKP75CvOlQylNhV4`) - Friendly, comforting, older voice
- **Daniel** (`onwK4e9ZLuTAKqWW03F9`) - British, formal, professional broadcast

### Character Voices:
- **Clyde** (`2EiwWnXFnvU5JabPnv8n`) - Intense, great for characters
- **Charlie** (`IKne3meq5aSn9XLyUdCD`) - Australian, energetic
- **Callum** (`N2lVS1w4EtoT3dr4eOWO`) - Gravelly, unsettling edge

## Example: Change Voice ID

1. Edit `server/.env`:
   ```env
   ELEVENLABS_VOICE_ID=g6xIsTj2HwM6VR4iXFCw
   ```

2. Restart the server:
   ```bash
   cd server
   npm start
   ```

3. Test it by using voiceover in your app - the new voice will be used automatically!

## Preview Voices

You can preview voices by:
1. Visiting the [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Clicking on any voice to hear a preview
3. Finding the voice ID in the URL or voice details

## Current Default

The default voice ID is `g6xIsTj2HwM6VR4iXFCw`.

## Troubleshooting

- **Voice not changing?** Make sure you restarted the server after changing `.env`
- **Invalid voice ID?** Check that the voice ID exists in your ElevenLabs account
- **Want to see all voices?** Use the `/api/elevenlabs/voices` endpoint to list all available voices

