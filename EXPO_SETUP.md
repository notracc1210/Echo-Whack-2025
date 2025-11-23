# Running the App in Expo Go

This app has been converted to run in Expo Go. Follow these steps to get started:

## Prerequisites

1. Install Node.js (v16 or later)
2. Install the Expo Go app on your iOS or Android device:
   - iOS: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Download from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo development server:**
   ```bash
   npm start
   ```
   or
   ```bash
   npx expo start
   ```

3. **Connect your device:**
   - Make sure your phone and computer are on the same Wi-Fi network
   - Scan the QR code that appears in the terminal with:
     - **iOS**: Use the Camera app
     - **Android**: Use the Expo Go app to scan the QR code

4. **Alternative: Use tunnel mode** (if on different networks):
   ```bash
   npx expo start --tunnel
   ```

## Troubleshooting

- If you see "Unable to resolve module" errors, try:
  ```bash
  npm install
  npx expo start --clear
  ```

- If the app doesn't load, make sure:
  - Your device and computer are on the same network
  - No firewall is blocking the connection
  - You've installed all dependencies

## Development

- The app will automatically reload when you make changes
- Shake your device to open the developer menu
- Press `r` in the terminal to reload the app
- Press `m` to toggle the menu

## Building for Production

To create a standalone app (not Expo Go), you'll need to:
1. Install EAS CLI: `npm install -g eas-cli`
2. Configure your app: `eas build:configure`
3. Build: `eas build --platform ios` or `eas build --platform android`

## Backend Server Setup

This app uses a backend server for Google Cloud Speech-to-Text and OpenAI ChatGPT integration.

1. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` in the root directory
   - Follow the instructions in `GOOGLE_CLOUD_SETUP.md` to set up Google Cloud credentials

3. **Start the backend server:**
   ```bash
   npm run server
   ```
   
   Or for development:
   ```bash
   npm run server:dev
   ```

4. **Start the frontend:**
   ```bash
   npm start
   ```

For detailed Google Cloud setup instructions, see `GOOGLE_CLOUD_SETUP.md`.

