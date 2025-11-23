# Echo - Voice-First Mobile App for Seniors

Echo addresses accessibility challenges for seniors. Many apps rely on small text and complex navigation. We built a voice-first app that lets users speak naturally to access health services, medication reminders, volunteer help, and community events.

## 🎯 What it does

Echo is a voice-first mobile app for seniors that provides:

- **Voice Interface**: Speak naturally to navigate and ask questions
- **Emergency Access**: One-tap 911 button
- **Medication Management**: Set reminders and get medication suggestions based on symptoms
- **Volunteer Matching**: Find volunteers for home repair, mobility assistance, grocery help, companionship, tech support, and medical transportation
- **Health Services Locator**: Find nearby hospitals and clinics using location services
- **Community Events**: Discover local events like walking groups and workshops
- **AI-Powered Guidance**: Get answers to health questions through natural conversation

## 🛠️ How we built it

- **Frontend**: React Native with Expo for cross-platform support
- **Backend**: Express.js server with Google Cloud Speech-to-Text, OpenAI GPT-4, and ElevenLabs Text-to-Speech
- **Features**: Voice command routing, medication reminders with notifications, location-based health services, and volunteer matching algorithm

## 🚧 Challenges we ran into

- **Google Cloud Quota Limits**: Implemented quota monitoring and error handling
- **Audio Format Compatibility**: Handled different formats (WEBM_OPUS, M4A, AAC) across platforms
- **Cross-Platform Audio**: Created abstraction layers for Web and React Native audio APIs
- **Voice Command Parsing**: Built flexible matching to understand varied natural language inputs

## ✨ Accomplishments that we're proud of

- **Voice-First Design**: Intuitive interface that reduces reliance on typing
- **Comprehensive Features**: Integrated medication management, volunteer matching, health services, and events in one app
- **Cross-Platform**: Works on iOS, Android, and Web with consistent UX
- **Accessibility Focus**: Large buttons, clear hierarchy, and voice-first interaction designed for seniors
- **Smart Routing**: AI-powered voice command routing that understands intent

## 📚 What we learned

- Managing multiple third-party APIs requires robust error handling and quota monitoring
- Audio processing needs abstraction layers for cross-platform compatibility
- Voice interfaces need clear feedback and fallback options
- Senior-friendly design requires large touch targets and simple navigation
- Natural language understanding requires flexible matching algorithms

## 🚀 What's next for Echo

- **Offline Mode**: Support basic functionality without internet
- **Multi-Language Support**: Expand beyond English
- **Caregiver Dashboard**: Allow family members to monitor medication adherence
- **Healthcare Integration**: Connect with electronic health records
- **Enhanced Volunteer Network**: Build a real matching system with profiles and scheduling
- **Telehealth Integration**: Add video call capabilities for remote consultations
- **Community Features**: Enable users to create and share events
- **Accessibility Enhancements**: Add screen reader support and larger text options

## 🏃 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Google Cloud account (for Speech-to-Text)
- OpenAI API key (for GPT-4)
- ElevenLabs API key (for Text-to-Speech)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Whack 2025 5"
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Set up environment variables**
   
   Create `server/.env` file:
   ```env
   PORT=3001
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   OPENAI_API_KEY=your-openai-api-key
   GEMINI_API_KEY=your-gemini-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   ELEVENLABS_VOICE_ID=your-voice-id
   GOOGLE_PLACES_API_KEY=your-places-api-key
   ```

   See setup guides:
   - [Google Cloud Setup](./GOOGLE_CLOUD_SETUP.md)
   - [ElevenLabs Setup](./ELEVENLABS_SETUP.md)
   - [Gemini Setup](./GEMINI_SETUP.md)

4. **Start the development server**
   ```bash
   # Terminal 1: Start backend server
   npm run server

   # Terminal 2: Start Expo app
   npm start
   ```

## 📖 Documentation

- [Google Cloud Setup Guide](./GOOGLE_CLOUD_SETUP.md)
- [ElevenLabs Voice Setup](./ELEVENLABS_SETUP.md)
- [Change Voice Guide](./CHANGE_VOICE.md)
- [Google Cloud Quota Fix](./GOOGLE_CLOUD_QUOTA_FIX.md)
- [Expo Setup](./EXPO_SETUP.md)
- [Environment File Rules](./ENV_FILE_RULES.md)

## 🏗️ Project Structure

```
.
├── components/          # React Native components
│   ├── pages/          # Page components
│   ├── ui/             # UI components
│   └── ...
├── server/             # Express.js backend
│   ├── index.js       # Main server file
│   └── .env           # Environment variables
├── utils/              # Utility functions
│   ├── api.ts         # API client
│   ├── audioRecorder.ts
│   └── ...
└── ...
```

## 🔧 Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run server` - Start backend server
- `npm run server:dev` - Start backend server in development mode

## 📝 License

This project is private and proprietary.

## 👥 Team

Built with ❤️ for seniors and their families.

