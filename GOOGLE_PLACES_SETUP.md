# Google Places API Setup Guide

This guide will help you set up Google Places API to enable real nearby health services lookup in your app.

## Prerequisites

- A Google Cloud account (you should already have this if you've set up Speech-to-Text)
- Access to the same Google Cloud project you're using for Speech-to-Text

## Step 1: Enable Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the same project you're using for Speech-to-Text
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Places API"** (or "Places API (New)")
5. Click on **"Places API"** or **"Places API (New)"**
6. Click **"Enable"**

**Note**: Google has both "Places API" (legacy) and "Places API (New)". Either will work, but the new API is recommended for new projects.

## Step 2: Create an API Key

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"**
4. Your API key will be created and displayed
5. **Important**: Copy the API key immediately - you'll need it in the next step

## Step 3: Restrict the API Key (Recommended for Security)

1. Click **"RESTRICT KEY"** button (or click on the API key name to edit it)
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"Places API"** (or "Places API (New)")
3. Under **"Application restrictions"** (optional but recommended):
   - For development: Select **"None"** or **"HTTP referrers"**
   - For production: Add your app's domain/IP addresses
4. Click **"SAVE"**

## Step 4: Add API Key to Your Server Configuration

1. Navigate to your server directory:
   ```bash
   cd server
   ```

2. Open the `.env` file (or create it if it doesn't exist)

3. Add the following line:
   ```env
   GOOGLE_PLACES_API_KEY=your-api-key-here
   ```
   
   Replace `your-api-key-here` with the API key you copied in Step 2.

4. Save the file

## Step 5: Restart Your Server

After adding the API key, restart your server for the changes to take effect:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm start
```

## Step 6: Test the Feature

1. Open your app
2. Navigate to the Health Services page (say "health services" or "find hospitals")
3. Grant location permission when prompted
4. You should now see real nearby health services instead of sample data!

## Pricing Information

Google Places API has a free tier:
- **Free tier**: $200 credit per month (equivalent to ~40,000 requests)
- **After free tier**: $0.017 per request for Nearby Search

For most development and testing, the free tier should be sufficient.

## Troubleshooting

### "API key not valid" error
- Verify the API key is correct in your `.env` file
- Make sure Places API is enabled in your Google Cloud project
- Check that the API key restrictions allow Places API

### "This API project is not authorized to use this API" error
- Go to Google Cloud Console > APIs & Services > Library
- Search for "Places API" and make sure it's enabled
- Wait a few minutes after enabling - it may take time to propagate

### Still seeing sample data
- Make sure you've restarted the server after adding the API key
- Check server logs for any error messages
- Verify the API key is in `server/.env` file (not root `.env`)

### Quota exceeded error
- Check your Google Cloud Console > APIs & Services > Dashboard
- You may have exceeded the free tier limit
- Consider adding billing or waiting for the monthly reset

## Security Best Practices

1. **Never commit your API key to version control** - `.env` files should be in `.gitignore`
2. **Restrict your API key** - Only allow Places API and restrict by IP/domain in production
3. **Monitor usage** - Set up billing alerts in Google Cloud Console
4. **Rotate keys regularly** - Create new keys and remove old ones periodically

## Next Steps

Once you've added the API key:
- The health services feature will automatically use Google Places API
- You'll see real hospitals, clinics, pharmacies, and urgent care centers
- Results include real addresses, ratings, and hours
- The app falls back to sample data if the API key is missing or invalid

