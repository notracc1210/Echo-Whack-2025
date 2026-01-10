# Gemini API Setup Guide for Medication Guide

This guide will help you set up Google Gemini API for the medication guide feature. The medication guide uses Gemini API as the primary provider, with automatic fallback to OpenAI if Gemini is not configured.

## Why Gemini for Medication Guide?

- **Separate quota**: Uses different API quota from OpenAI, reducing load on a single provider
- **Free tier available**: Generous free tier (15 requests/minute, 1,500 requests/day)
- **Good for structured data**: Gemini excels at generating structured JSON responses
- **Automatic fallback**: Falls back to OpenAI if Gemini is unavailable

## Prerequisites

1. A Google account
2. Node.js installed (v16 or later)
3. npm or yarn package manager

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Or visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Select or create a Google Cloud project (or use default)
5. Copy your API key immediately
   - **Important**: Save the key securely - you may not be able to see it again

## Step 2: Configure Environment Variables

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Open or create the `.env` file:
   ```bash
   # If .env doesn't exist, create it
   touch .env
   ```

3. Add your Gemini API key to `server/.env`:
   ```env
   # Gemini API Key (for medication guide)
   GEMINI_API_KEY=your-gemini-api-key-here
   
   # Optional: Gemini model to use (default: gemini-pro)
   # Options: gemini-pro, gemini-pro-vision, gemini-1.5-pro, etc.
   GEMINI_MODEL=gemini-pro
   ```

4. **Important**: 
   - Replace `your-gemini-api-key-here` with your actual API key
   - Never commit the `.env` file to version control
   - The API key should be a long string (typically starts with letters/numbers)

## Step 3: Install Dependencies

The Gemini SDK should already be installed, but if needed:

```bash
cd server
npm install @google/generative-ai
```

## Step 4: Restart the Server

After adding the API key, restart your server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd server
npm start

# Or for development with auto-reload:
npm run dev
```

## Step 5: Verify Setup

1. **Check the diagnostic endpoint**:
   ```bash
   curl http://localhost:3001/api/diagnose
   ```
   
   Look for:
   ```json
   {
     "configuration": {
       "geminiApiKey": "Set",
       "geminiModel": "Using default (gemini-pro)"
     },
     "tests": {
       "geminiClient": "Initialized - working model: gemini-pro",
       "geminiApiConnection": "Connected successfully..."
     }
   }
   ```

2. **Test medication suggestions**:
   ```bash
   curl -X POST http://localhost:3001/api/medication-suggestions \
     -H "Content-Type: application/json" \
     -d '{"symptoms":"headache"}'
   ```

## How It Works

### Primary: Gemini API
- Medication guide uses Gemini API when `GEMINI_API_KEY` is configured
- Uses `gemini-pro` model by default (or `GEMINI_MODEL` if set)
- Generates structured JSON responses for medication suggestions

### Fallback: OpenAI
- If Gemini API key is not configured, falls back to OpenAI
- If Gemini API call fails, automatically falls back to OpenAI
- Ensures medication guide always works if at least one API is configured

## Quota Information

### Gemini API Free Tier:
- **Requests per minute**: 15 RPM
- **Requests per day**: 1,500 requests/day
- **Rate limit**: 2 requests/second per user

### When You Might Hit Limits:
- If you exceed 15 requests/minute, you'll get rate limit errors
- If you exceed 1,500 requests/day, you'll hit daily quota limits
- The app will automatically fall back to OpenAI if Gemini quota is exceeded

### Requesting Higher Quotas:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Quotas**
3. Search for "Generative Language API"
4. Click on the quota you want to increase
5. Click **EDIT QUOTAS** and submit a request

## Troubleshooting

### "Gemini API key not configured"
- Make sure `GEMINI_API_KEY` is set in `server/.env`
- Restart the server after adding the key
- Check that the key doesn't have extra spaces or quotes

### "Gemini API error, falling back to OpenAI"
- This is normal behavior - the app will use OpenAI as fallback
- Check your API key is valid
- Verify you haven't exceeded quota limits
- Check [Google AI Studio](https://aistudio.google.com/app/apikey) for API status

### "Invalid API key"
- Verify your API key is correct
- Make sure you copied the entire key (no truncation)
- Check that the key is active in Google AI Studio

### Rate Limit Errors
- You're making too many requests per minute (limit: 15 RPM)
- Wait a few seconds between requests
- Consider upgrading to paid tier for higher limits

## Environment Variables Reference

Add these to `server/.env`:

```env
# Required for medication guide (recommended)
GEMINI_API_KEY=your-api-key-here

# Optional: Model selection
GEMINI_MODEL=gemini-pro

# Fallback: OpenAI (still required for other features)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
```

## Benefits of Using Gemini for Medication Guide

1. **Quota Separation**: Medication guide uses separate quota from main AI queries
2. **Cost Efficiency**: Free tier is generous for moderate usage
3. **Reliability**: Automatic fallback ensures service continuity
4. **Performance**: Gemini is optimized for structured JSON responses
5. **Future-Proof**: Easy to switch models or add features

## Next Steps

- Test the medication guide feature in your app
- Monitor API usage in Google AI Studio
- Set up quota alerts if needed
- Consider upgrading if you need higher limits

## Support

- **Gemini API Documentation**: https://ai.google.dev/docs
- **Google AI Studio**: https://aistudio.google.com/
- **Quota Management**: https://console.cloud.google.com/iam-admin/quotas










