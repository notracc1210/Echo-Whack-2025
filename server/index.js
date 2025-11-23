const express = require('express');
const multer = require('multer');
const speech = require('@google-cloud/speech');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId)),
      new Promise((_, reject) =>
        setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout)
      ),
    ]);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize Google Cloud Speech client
// Uses Application Default Credentials (ADC) - no key file needed
const speechClient = new speech.SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Gemini (for medication guide)
let geminiClient = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
  try {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini API client initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Gemini client:', error.message);
  }
} else {
  console.log('Gemini API key not configured - medication guide will use OpenAI');
}

// Default OpenAI model (using gpt-4o for best compatibility)
// Note: If you want to use a different model, set OPENAI_MODEL in .env
const DEFAULT_MODEL = 'gpt-4o';

// Default Gemini model for medication suggestions
const DEFAULT_GEMINI_MODEL = 'gemini-pro';

// Speech-to-Text endpoint
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No audio file received');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate audio buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error('Audio buffer is empty');
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    console.log(`Received audio file: size=${req.file.buffer.length} bytes, mimetype=${req.file.mimetype}, originalname=${req.file.originalname}`);

    const audioBytes = req.file.buffer.toString('base64');
    
    if (!audioBytes || audioBytes.length === 0) {
      console.error('Failed to convert audio to base64');
      return res.status(400).json({ error: 'Failed to process audio data' });
    }

    const audioFormat = req.body.format || 'WEBM_OPUS'; // Default format
    const sampleRateHertz = parseInt(req.body.sampleRate) || 48000;
    const languageCode = req.body.languageCode || 'en-US';

    // Map format strings to Google Cloud encoding types
    // Note: Google Cloud Speech-to-Text supports: FLAC, LINEAR16, MULAW, AMR, AMR_WB, 
    // OGG_OPUS, SPEEX_WITH_HEADER_BYTE, WEBM_OPUS, MP3
    // M4A/AAC is NOT directly supported - we'll try to use MP3 encoding or convert
    const encodingMap = {
      'WEBM_OPUS': 'WEBM_OPUS',
      'WEBM': 'WEBM_OPUS',
      'MP3': 'MP3',
      'M4A': 'MP3', // M4A files often work with MP3 encoding (if they contain MP3 data)
      'AAC': 'MP3', // Try MP3 encoding for AAC files
      'LINEAR16': 'LINEAR16',
      'FLAC': 'FLAC',
    };

    let encoding = encodingMap[audioFormat.toUpperCase()] || 'WEBM_OPUS';
    
    // For M4A files, if MP3 doesn't work, we might need to convert
    // For now, try MP3 first since some M4A files contain MP3 data
    
    console.log(`Processing audio: format=${audioFormat}, encoding=${encoding}, sampleRate=${sampleRateHertz}, base64Length=${audioBytes.length}`);

    // Validate audio content before sending
    if (!audioBytes || audioBytes.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid audio data: empty base64 string' });
    }

    // Configure recognition request
    // Google Cloud Speech-to-Text requires explicit encoding
    // M4A/AAC is NOT supported - we need to handle this differently
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        enableAutomaticPunctuation: true,
        model: 'latest_short', // Changed from latest_long to latest_short for faster processing
      },
    };

    // Validate request structure
    if (!request.audio || !request.audio.content) {
      console.error('Invalid request structure:', JSON.stringify(request, null, 2));
      return res.status(500).json({ error: 'Invalid request structure: audio content missing' });
    }

    console.log(`Sending request to Google Cloud Speech-to-Text: audioContentLength=${request.audio.content.length}, encoding=${encoding}`);
    
    // Perform speech recognition
    const [response] = await speechClient.recognize(request);
    
    console.log('Received response from Google Cloud Speech-to-Text');
    
    if (!response.results || response.results.length === 0) {
      return res.status(400).json({ error: 'No speech detected' });
    }

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    res.json({ transcription });
  } catch (error) {
    console.error('Speech-to-text error:', error);
    // Provide more helpful error messages
    let errorMessage = 'Failed to process speech';
    if (error.message?.includes('Permission denied') || error.message?.includes('permission')) {
      errorMessage = 'Permission denied. Please check Google Cloud authentication.';
    } else if (error.message?.includes('API not enabled')) {
      errorMessage = 'Speech-to-Text API not enabled. Please enable it in Google Cloud Console.';
    } else if (error.message?.includes('Invalid audio')) {
      errorMessage = 'Invalid audio format. Please try recording again.';
    } else if (error.message?.includes('RESOURCE_EXHAUSTED') || 
               error.message?.includes('429') || 
               error.message?.includes('quota') || 
               error.message?.includes('QUOTA_EXCEEDED') ||
               error.code === 8) { // gRPC RESOURCE_EXHAUSTED code
      errorMessage = 'Google Cloud Speech-to-Text quota exceeded. Please check your quota limits in Google Cloud Console or wait a few minutes before trying again. See GOOGLE_CLOUD_QUOTA_FIX.md for solutions.';
    } else {
      errorMessage = error.message || 'Failed to process speech';
    }
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message,
      service: 'Google Cloud Speech-to-Text', // Service identifier
      quotaExceeded: error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429') || error.message?.includes('quota') || error.code === 8
    });
  }
});

// Rate limiting: Track last request time to avoid hitting rate limits
let lastOpenAIRequestTime = 0;
const MIN_REQUEST_INTERVAL = 0; // Reduced from 1000ms to 0ms for faster processing (adjust if you hit rate limits)

// AI Query endpoint (OpenAI ChatGPT)
app.post('/api/ai-query', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here' || process.env.OPENAI_API_KEY.trim() === '') {
      console.warn('OpenAI API key not configured');
      console.warn('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY ? 'Set but may be invalid' : 'Not set');
      return res.json({ 
        response: `I heard you say: "${text}". To enable AI responses, please configure your OpenAI API key in the server/.env file. See GOOGLE_CLOUD_SETUP.md for instructions.` 
      });
    }

    // Validate API key format (OpenAI API keys typically start with 'sk-')
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.warn('OpenAI API key format appears invalid (should start with "sk-")');
    }

    const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    console.log(`Using OpenAI model: ${modelName}`);
    
    // Rate limiting: Add delay if requests are too frequent
    const now = Date.now();
    const timeSinceLastRequest = now - lastOpenAIRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: Waiting ${delay}ms before next request...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    lastOpenAIRequestTime = Date.now();

    const prompt = `You are a warm, concise AI assistant inside a community resource app.

The app provides ONLY:

• Events & Activities (walking groups, lunches, workshops, clubs)

• Volunteer Support & Matching (finding volunteers from NGOs or students for help)

• Health Services (hospitals, clinics, urgent care)

The user said: "${text}"

Your goals:

1. Acknowledge the message naturally.

2. Route the user to the correct section (Events, Volunteers, Health Services, or General Info).

3. Give clear, simple, concise guidance.

4. Stay warm, supportive, and easy to understand.

5. If voice is enabled, respond in a way that sounds natural when spoken aloud.

6. Use the user's saved preferences when helpful (e.g., they like walking groups).

----------------------------------------------------

CRITICAL REMINDER: NEVER SUGGEST USERS BECOME VOLUNTEERS

----------------------------------------------------

• Users are NEVER volunteers - volunteers come from NGOs or students only.
• Users can FIND volunteers for help, but NEVER suggest users become volunteers themselves.
• NEVER use phrases like "you could volunteer", "consider volunteering", "volunteer opportunities", "become a volunteer", or "sign up to volunteer".
• For loneliness or social connection, suggest Events - NOT volunteering.
• Always frame volunteer suggestions as "finding a volunteer" or "matching with a volunteer" - never as becoming one.

----------------------------------------------------

BEHAVIOR RULES

----------------------------------------------------

GENERAL TONE

• Always be concise. Avoid long paragraphs.

• Always be warm, friendly, and simple.

• Always end with a gentle helpful suggestion or question.

ROUTING LOGIC

• Events → when users ask about activities, things to do, social connection, loneliness, "recommend something," or meals.
  - Mention "Events" or "Events section" in your response so buttons appear.

• Volunteers → when users ask for help, companionship, escorting, logistics, tech help, safety reassurance, or assistance.
  - Mention "Volunteers" or "Volunteer Matching" in your response so buttons appear.
  - IMPORTANT: Users can FIND volunteers, but NEVER suggest users become volunteers themselves.

• Health Services → when asking about medical care, clinics, hospitals, hours, directions.
  - Mention "Health Services" or "Health" in your response so buttons appear.

• General Info → when none of the above fit.

VOLUNTEER POLICY (CRITICAL)

• Volunteers in this app are from NGOs or students - they are NOT regular app users.
• Users can FIND and MATCH with volunteers for help, but users themselves should NEVER be suggested to become volunteers.
• NEVER suggest users sign up, register, or become volunteers.
• NEVER suggest users volunteer their time or services.
• NEVER suggest volunteering as a solution to loneliness, boredom, or social connection - suggest Events instead.
• NEVER use phrases like "you could volunteer", "consider volunteering", "volunteer opportunities", "become a volunteer", or "sign up to volunteer".
• When suggesting volunteers, always frame it as "finding a volunteer" or "matching with a volunteer" - never as "becoming a volunteer" or "volunteering".
• For loneliness, isolation, or social connection needs, prioritize Events section - do NOT suggest volunteers unless user explicitly needs help or assistance.

LOCATION & SUGGESTIONS

• You may use the user's location (if granted).

• ONLY suggest places officially inside the app (events, clinics, official community facilities).

• NEVER recommend parks, streets, neighborhoods, or any external location.

• If nothing is available, say: "I don't see anything right now, but I can help you try another section."

SAFETY & EMERGENCY

• If the user describes an emergency (chest pain, can't breathe, fainted, fire, etc.):

  - Tell them to call 911 immediately.

  - Surface or mention the emergency call button.

  - Do NOT direct them to app sections.

SENSITIVE TOPICS

Avoid financial questions, benefits, insurance, caregiver requests, or personal-family care.

Say you can't assist with that and redirect gently to a safe section (Events / Volunteers / General Info).

SOCIAL & EMOTIONAL SUPPORT

• Respond warmly to loneliness/stress.

• When users mention feeling lonely, isolated, or needing social connection:
  - ALWAYS prioritize suggesting the Events section for activities and social connection.
  - For loneliness, focus on Events - do NOT automatically suggest volunteers.
  - Only suggest Volunteer Matching if the user explicitly asks for help, assistance, or needs someone to accompany them.
  - NEVER suggest users become volunteers themselves or volunteer their time.
  - NEVER phrase suggestions as "you could volunteer" or "consider volunteering" - volunteers are for finding, not becoming.
  - Use natural language like "check out Events" or "explore activities" so buttons appear.
  - If volunteers are mentioned, always frame it as "finding a volunteer" or "matching with a volunteer" - never as volunteering or becoming a volunteer.

• Keep responses short and comforting.

SAFETY-RELATED QUESTIONS (non-urgent)

• Provide general reassurance/information.

• You may suggest finding a volunteer escort if appropriate (NEVER suggest the user become a volunteer).

• Do NOT give legal advice or security instructions.

TECH HELP

• Give simple step-by-step instructions.

• You may suggest finding a volunteer for tech help if needed (NEVER suggest the user become a volunteer).

LANGUAGE HELP

• Provide simple translations or explanations.

• Keep them short and clear.

LOGISTICS & DIRECTIONS

• Give short, simple instructions.

• You may suggest finding a volunteer if help is needed (NEVER suggest the user become a volunteer).

WEATHER

• You may use internet/weather APIs to answer.

• Provide simple info and optionally suggest finding a volunteer escort if needed (NEVER suggest the user become a volunteer).

• Do NOT recommend unofficial places.

OFF-TOPIC QUESTIONS

• You may answer safe topics (jokes, definitions, simple info).

• Avoid politics, medical diagnoses, financial advice, or opinions.

• Redirect gently back to app functions if needed.

PREFERENCES & MEMORY

• You may remember user preferences (e.g., likes walking groups) across sessions.

• Do NOT store sensitive personal data.

MULTI-STEP REQUESTS

• Handle multiple requests cleanly (event + volunteer, clinic + directions).

• Stay concise.

NO REPORTS / COMPLAINTS

• Do not collect or process complaints.

• Redirect politely to another section.

----------------------------------------------------

OUTPUT FORMAT

----------------------------------------------------

• 1–3 short sentences total.

• Conversational, friendly, supportive.

• Ends with a helpful suggestion or question.

• Never exceeds 150 words (normally much shorter).

ROUTING INDICATORS

After your response text, if you suggest routing to a specific section, add routing indicators on a new line:

• [ROUTE:events] - if suggesting Events & Activities
• [ROUTE:volunteers] - if suggesting Volunteer Support & Matching  
• [ROUTE:health] - if suggesting Health Services

You can include multiple routes if suggesting multiple sections (e.g., [ROUTE:events] [ROUTE:volunteers]).

Example response format:
"I'd love to help you find some activities! Check out the Events section for walking groups and community lunches. [ROUTE:events]"

Example for volunteers (CORRECT - finding volunteers):
"I can help you find a volunteer companion who can assist you. Check out Volunteer Matching. [ROUTE:volunteers]"

Example for volunteers (WRONG - never suggest this):
"You could volunteer to help others" or "Consider volunteering" or "Become a volunteer"

If no specific routing is needed, don't include any route indicators.`;

    console.log(`Sending prompt to OpenAI for text: "${text.substring(0, 50)}..."`);
    
    // Add retry logic for transient network errors (optimized for speed)
    let result;
    let lastError;
    const maxRetries = 1; // Reduced from 2 to 1 for faster failure
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} of ${maxRetries}...`);
          // Reduced backoff delay: 500ms instead of 1000ms * attempt
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Add timeout to prevent hanging (30 seconds max)
        result = await Promise.race([
          openai.chat.completions.create({
            model: modelName,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: 500,
            temperature: 0.7,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
          )
        ]);
        break; // Success, exit retry loop
      } catch (retryError) {
        lastError = retryError;
        const isNetworkError = retryError.code === 'ENOTFOUND' || 
                              retryError.code === 'ECONNREFUSED' || 
                              retryError.code === 'ETIMEDOUT' ||
                              retryError.code === 'ECONNRESET' ||
                              retryError.message?.includes('network') ||
                              retryError.message?.includes('fetch') ||
                              retryError.message?.includes('timeout');
        
        // Only retry on network errors, not on API errors
        if (!isNetworkError || attempt === maxRetries) {
          throw retryError; // Re-throw if not a network error or max retries reached
        }
        console.warn(`Network error on attempt ${attempt + 1}, will retry...`);
      }
    }
    
    const aiText = result.choices[0]?.message?.content || '';
    console.log(`Received AI response: "${aiText.substring(0, 100)}..."`);

    // Parse routing indicators from the response
    const routePattern = /\[ROUTE:(\w+)\]/g;
    const routes = [];
    let match;
    while ((match = routePattern.exec(aiText)) !== null) {
      routes.push(match[1]);
    }

    // Clean the response text by removing routing indicators
    const cleanedResponse = aiText.replace(/\[ROUTE:\w+\]/g, '').trim();

    // Detect routing keywords in the AI's RESPONSE text (case-insensitive)
    // This ensures buttons appear based on what the AI actually suggests
    const lowerResponse = cleanedResponse.toLowerCase();
    
    // Comprehensive keywords that indicate the AI is suggesting these sections
    const eventsKeywords = [
      'events', 'event', 'activities', 'activity', 'activities section', 'events section',
      'walking group', 'walking groups', 'community lunch', 'community lunches', 
      'workshop', 'workshops', 'book club', 'book clubs',
      'social connection', 'social connections', 'things to do', 'something to do',
      'explore events', 'check out events', 'try events', 'visit events',
      'loneliness', 'lonely', 'social activities', 'community activities'
    ];
    
    const volunteerKeywords = [
      'volunteer', 'volunteers', 'volunteer matching', 'volunteer support', 
      'volunteer section', 'volunteers section', 'volunteer matching section',
      'help', 'companionship', 'escort', 'someone to talk', 'connect with',
      'explore volunteers', 'check out volunteers', 'try volunteers', 'visit volunteers',
      'volunteer opportunities', 'find a volunteer', 'match with a volunteer'
    ];
    
    const healthKeywords = [
      'health services', 'health service', 'health services section',
      'hospital', 'hospitals', 'clinic', 'clinics', 'urgent care', 
      'medical care', 'doctor', 'doctors', 'medical services',
      'explore health', 'check out health', 'try health services', 'visit health',
      'find a hospital', 'find a clinic', 'medical help'
    ];

    // Check if AI's response mentions any routing keywords
    // Only add routes if AI explicitly suggests them in its response
    if (routes.length === 0) {
      if (eventsKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('events');
      }
      if (volunteerKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('volunteers');
      }
      if (healthKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('health');
      }
    } else {
      // Even if we have explicit routes, also check for additional suggestions in response
      if (!routes.includes('events') && eventsKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('events');
      }
      if (!routes.includes('volunteers') && volunteerKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('volunteers');
      }
      if (!routes.includes('health') && healthKeywords.some(keyword => lowerResponse.includes(keyword))) {
        routes.push('health');
      }
    }

    // Map route names to page identifiers
    const routeMap = {
      'events': 'events',
      'volunteers': 'volunteer',
      'volunteer': 'volunteer',
      'health': 'health',
      'healthservices': 'health'
    };

    const suggestedRoutes = routes
      .map(route => routeMap[route.toLowerCase()])
      .filter(route => route !== undefined)
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    console.log(`Parsed routing suggestions: ${suggestedRoutes.join(', ')}`);

    res.json({ 
      response: cleanedResponse,
      suggestedRoutes: suggestedRoutes.length > 0 ? suggestedRoutes : undefined
    });
  } catch (error) {
    console.error('AI query error details:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Error name:', error.name);
    console.error('Error cause:', error.cause);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    if (error.error) {
      console.error('Error object:', JSON.stringify(error.error, null, 2));
    }
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'The AI service is currently unavailable';
    
    // Extract error details from OpenAI API response
    const errorDetails = error.error || error.response?.data || {};
    const errorType = errorDetails.type || errorDetails.code || '';
    const errorMsg = error.message || errorDetails.message || '';
    
    // Check for 404 errors (model not found) - these are configuration issues, not network errors
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('not supported') || errorType === 'invalid_request_error') {
      if (errorMsg.includes('gpt-5.1') || errorMsg.includes('model') && errorMsg.includes('not found')) {
        errorMessage = 'The model "gpt-5.1" is not available. Please update OPENAI_MODEL in server/.env to a valid model like "gpt-4o" or "gpt-3.5-turbo".';
      } else {
        errorMessage = 'OpenAI model not available. Please check your OpenAI API key and model name.';
      }
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'DNS resolution failed. Please check your internet connection and DNS settings.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The AI service may be temporarily unavailable.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      errorMessage = 'Connection timeout. Please check your internet connection and try again.';
    } else if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('invalid API key') || errorMsg.includes('API key not valid') || errorMsg.includes('Incorrect API key') || errorType === 'invalid_api_key') {
      errorMessage = 'Invalid OpenAI API key. Please check your server/.env file and ensure OPENAI_API_KEY is correct.';
    } else if (errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('permission') || errorType === 'permission_denied') {
      errorMessage = 'Permission denied. Please check your OpenAI API key permissions.';
    } else if (errorMsg.includes('QUOTA_EXCEEDED') || errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate_limit') || error.status === 429 || errorType === 'rate_limit_error' || errorType === 'insufficient_quota') {
      // This is definitely OpenAI quota/rate limit error
      const isRateLimit = errorType === 'rate_limit_error' || errorMsg.includes('rate_limit') || errorMsg.includes('requests per minute') || errorMsg.includes('RPM');
      if (isRateLimit) {
        errorMessage = 'OpenAI rate limit exceeded (too many requests per minute). Please wait a moment and try again. Consider upgrading your plan for higher rate limits at https://platform.openai.com/account/billing.';
      } else {
        errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at https://platform.openai.com/usage. You may need to add credits or upgrade your plan.';
      }
    } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
      errorMessage = 'Request timeout. The AI service took too long to respond. Please try again.';
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('NetworkError')) {
      // Only classify as network error if it's not a 404
      if (!errorMsg.includes('404')) {
        errorMessage = `Network error: ${errorMsg}. Please check your internet connection.`;
      } else {
        errorMessage = 'OpenAI model not available. Please check your API key and model configuration.';
      }
    } else if (errorMsg) {
      // Clean up any old Gemini error messages that might be cached
      if (errorMsg.includes('Google Cloud') || errorMsg.includes('Gemini') || errorMsg.includes('try a different model')) {
        errorMessage = 'OpenAI API error. Please check your API key, model configuration, and account status at https://platform.openai.com/usage.';
      } else {
        errorMessage = `AI service error: ${errorMsg}`;
      }
    }
    
    // Return a graceful fallback with more context
    const isQuotaError = errorMsg.includes('QUOTA_EXCEEDED') || errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate_limit') || error.status === 429 || errorType === 'rate_limit_error' || errorType === 'insufficient_quota';
    
    res.json({ 
      response: `I heard you say: "${req.body.text}". ${errorMessage}. Your message was received and the transcription worked correctly.`,
      error: errorMessage,
      service: 'OpenAI ChatGPT', // Service identifier
      quotaExceeded: isQuotaError,
      errorType: isQuotaError ? (errorType === 'rate_limit_error' ? 'rate_limit' : 'quota') : null
    });
  }
});

// Medication Suggestions endpoint (using Gemini API)
app.post('/api/medication-suggestions', async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return res.status(400).json({ error: 'No symptoms provided' });
    }

    // Create prompt for medication suggestions
    const prompt = `You are a helpful AI assistant that provides general information about over-the-counter (OTC) medications based on symptoms. 

IMPORTANT DISCLAIMERS:
- This is NOT medical advice
- Always consult a healthcare professional before taking any medication
- These are general suggestions for common, mild symptoms only
- For serious symptoms, seek immediate medical attention

The user described these symptoms: "${symptoms}"

Based on these symptoms, suggest 2-3 common over-the-counter medications that might help. For each medication, provide:
1. Medication name (e.g., "Acetaminophen (Tylenol)")
2. A brief description of what it's typically used for
3. Important safety notes (e.g., age restrictions, interactions, dosage warnings)

Format your response as a JSON array with this exact structure:
{
  "suggestions": [
    {
      "medication": "Medication Name",
      "description": "What this medication is used for",
      "safetyNotes": "Important safety information"
    }
  ],
  "disclaimer": "This is not medical advice. Always consult a healthcare professional before taking any medication."
}

Only suggest common OTC medications. If the symptoms sound serious (chest pain, difficulty breathing, severe pain, etc.), emphasize that the user should seek immediate medical attention.

Respond ONLY with valid JSON, no other text.`;

    console.log(`Generating medication suggestions for symptoms: "${symptoms.substring(0, 50)}..."`);
    
    let aiText = '';
    let useGemini = false;

    // Try Gemini first (preferred for medication guide)
    if (geminiClient) {
      try {
        const geminiModel = geminiClient.getGenerativeModel({ 
          model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL 
        });
        
        console.log('Using Gemini API for medication suggestions');
        useGemini = true;
        
        const result = await Promise.race([
          geminiModel.generateContent(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
          )
        ]);
        
        // result.response is a property, not a promise - no await needed
        const response = result.response;
        aiText = response.text();
        console.log('Gemini API response received successfully');
      } catch (geminiError) {
        console.warn('Gemini API error, falling back to OpenAI:', geminiError.message);
        useGemini = false;
        // Fall through to OpenAI fallback
      }
    }

    // Fallback to OpenAI if Gemini is not available or failed
    if (!useGemini) {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here' || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn('Neither Gemini nor OpenAI API key configured for medication suggestions');
        return res.json({ 
          suggestions: [],
          disclaimer: 'Please configure your GEMINI_API_KEY or OPENAI_API_KEY to enable medication suggestions. This is not medical advice - always consult a healthcare professional.'
        });
      }

      console.log('Using OpenAI API for medication suggestions (fallback)');
      const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;
      
      const result = await Promise.race([
        openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]);
      aiText = result.choices[0]?.message?.content || '';
    }
    
    // Clean up the response to extract JSON
    aiText = aiText.trim();
    // Remove markdown code blocks if present
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    try {
      const suggestions = JSON.parse(aiText);
      console.log(`Successfully parsed medication suggestions (using ${useGemini ? 'Gemini' : 'OpenAI'})`);
      res.json(suggestions);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiText.substring(0, 200));
      // Fallback response
      res.json({
        suggestions: [],
        disclaimer: 'Unable to process medication suggestions at this time. Please consult a healthcare professional. This is not medical advice.'
      });
    }
  } catch (error) {
    console.error('Medication suggestions error:', error);
    res.json({ 
      suggestions: [],
      disclaimer: 'Unable to process medication suggestions at this time. Please consult a healthcare professional. This is not medical advice.'
    });
  }
});

// Parse medication reminder from voice input
app.post('/api/parse-medication-reminder', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Create prompt to extract medication reminder information
    const prompt = `You are a helpful AI assistant that extracts medication reminder information from natural language voice input.

The user said: "${text}"

CRITICAL INSTRUCTION: DEFAULT TO SUCCESS = TRUE. Only set success to false if the input is CLEARLY and OBVIOUSLY not about medications (e.g., "what's the weather", "find events", "I need a volunteer").

If the user mentions ANY of these, ALWAYS set success = true:
- ANY medication name (Aspirin, Metformin, Insulin, Vitamin D, Tylenol, Ibuprofen, etc.)
- Words like: "remind", "reminder", "take", "medicine", "medication", "pill", "tablet", "drug", "schedule", "set"
- Time-related words when combined with medication context: "morning", "evening", "8am", "twice daily", etc.
- Even vague requests like "add a reminder" or "I need to remember to take something"

EXAMPLES THAT MUST RETURN success: true:
- "remind me to take aspirin" → success: true, name: "Aspirin", times: ["08:00"]
- "I need to take my medicine" → success: true, name: "Medication", times: ["08:00"]
- "add a reminder for metformin at 8am" → success: true, name: "Metformin", times: ["08:00"]
- "set reminder for vitamin d" → success: true, name: "Vitamin D", times: ["08:00"]
- "take insulin twice daily" → success: true, name: "Insulin", times: ["08:00", "20:00"]
- "medicine reminder" → success: true, name: "Medication", times: ["08:00"]
- "I want to add a medication" → success: true, name: "Medication", times: ["08:00"]

Extract the following information:
1. Medication name (REQUIRED - extract from text or use "Medication" as fallback)
   - Common medications: Aspirin, Metformin, Insulin, Vitamin D, Tylenol, Ibuprofen, etc.
   - If unclear, use "Medication" as the name - DO NOT return null
   - Capitalize properly: "aspirin" → "Aspirin", "vitamin d" → "Vitamin D"
2. Dosage (optional - default to "As prescribed" if not mentioned)
   - Look for: "100mg", "1 tablet", "2 pills", "500mg", etc.
3. Frequency (default to "Daily" if not mentioned)
   - "every day", "once a day", "daily" → "Daily"
   - "twice", "two times", "2x" → "Twice daily"
   - "three times", "3x" → "Three times daily"
   - "four times", "4x" → "Four times daily"
4. Reminder times (REQUIRED - MUST have at least 1 time)
   - ALWAYS provide at least one time, even if not explicitly mentioned
   - Default to ["08:00"] if no time information is provided
   - Extract times from: "8am", "9 PM", "morning", "evening", "8:00", etc.
   - Convert to 24-hour format: "8am" → "08:00", "9 PM" → "21:00"
   - Relative times: "morning" → "08:00", "afternoon" → "14:00", "evening" → "18:00", "night"/"bedtime" → "20:00"
   - If frequency mentioned: "twice daily" → ["08:00", "20:00"], "three times" → ["08:00", "14:00", "20:00"]

Time extraction rules:
- 12-hour to 24-hour: "8am" → "08:00", "9:30 PM" → "21:30", "12:00 PM" → "12:00", "12:00 AM" → "00:00"
- Relative times: morning=08:00, afternoon=14:00, evening=18:00, night/bedtime=20:00
- Frequency-based defaults:
  - Daily/once = ["08:00"]
  - Twice daily = ["08:00", "20:00"]
  - Three times = ["08:00", "14:00", "20:00"]
  - Four times = ["08:00", "12:00", "18:00", "22:00"]
- Maximum 3 times
- If absolutely no time info: use ["08:00"]

Format your response as JSON with this exact structure:
{
  "name": "Medication name (REQUIRED - never null, use 'Medication' if unclear)",
  "dosage": "Dosage or 'As prescribed'",
  "frequency": "Daily" | "Twice daily" | "Three times daily" | "Four times daily" | "As needed",
  "reminderTimes": ["HH:MM"] (REQUIRED - array with at least 1 time in 24-hour format),
  "success": true (ALWAYS true unless clearly not about medications),
  "message": "Brief description of what was extracted"
}

REMEMBER: When in doubt, set success = true. It's better to create a reminder that needs editing than to deny the user's request.

Respond ONLY with valid JSON, no other text.`;

    console.log(`Parsing medication reminder from text: "${text.substring(0, 50)}..."`);
    
    let aiText = '';
    let useGemini = false;

    // Try Gemini first (preferred for medication guide)
    if (geminiClient) {
      try {
        const geminiModel = geminiClient.getGenerativeModel({ 
          model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL 
        });
        
        console.log('Using Gemini API for medication reminder parsing');
        useGemini = true;
        
        const result = await Promise.race([
          geminiModel.generateContent(prompt),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
          )
        ]);
        
        const response = result.response;
        aiText = response.text();
        console.log('Gemini API response received successfully');
      } catch (geminiError) {
        console.warn('Gemini API error, falling back to OpenAI:', geminiError.message);
        useGemini = false;
      }
    }

    // Fallback to OpenAI if Gemini is not available or failed
    if (!useGemini) {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here' || process.env.OPENAI_API_KEY.trim() === '') {
        console.warn('Neither Gemini nor OpenAI API key configured for medication reminder parsing');
        return res.json({ 
          success: false,
          message: 'AI service not configured. Please configure your GEMINI_API_KEY or OPENAI_API_KEY.',
          name: null,
          dosage: null,
          frequency: null,
          reminderTimes: []
        });
      }

      console.log('Using OpenAI API for medication reminder parsing (fallback)');
      const modelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;
      
      const result = await Promise.race([
        openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent parsing
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]);
      aiText = result.choices[0]?.message?.content || '';
    }
    
    // Clean up the response to extract JSON
    aiText = aiText.trim();
    // Remove markdown code blocks if present
    aiText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    try {
      const parsed = JSON.parse(aiText);
      console.log(`Successfully parsed medication reminder (using ${useGemini ? 'Gemini' : 'OpenAI'}):`, parsed);
      
      // Validate and normalize the response
      if (!parsed.reminderTimes || !Array.isArray(parsed.reminderTimes)) {
        parsed.reminderTimes = [];
      }
      
      // Ensure times are in correct format (HH:MM)
      parsed.reminderTimes = parsed.reminderTimes
        .filter(time => time && typeof time === 'string')
        .map(time => {
          // Normalize time format
          const normalized = time.trim();
          // If it's already in HH:MM format, return as is
          if (/^\d{1,2}:\d{2}$/.test(normalized)) {
            const [hours, minutes] = normalized.split(':').map(Number);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
          return normalized;
        })
        .slice(0, 3); // Limit to 3 times
      
      // Server-side fallback: If success is true but missing critical data, try to fix it
      if (parsed.success) {
        // Ensure we have a name (use "Medication" as fallback)
        if (!parsed.name || parsed.name.trim() === '' || parsed.name === 'null') {
          // Try to extract medication name from original text
          const medicationKeywords = ['aspirin', 'metformin', 'insulin', 'vitamin', 'tylenol', 'ibuprofen', 'medicine', 'medication', 'pill', 'tablet'];
          const lowerText = text.toLowerCase();
          for (const keyword of medicationKeywords) {
            if (lowerText.includes(keyword)) {
              // Capitalize first letter
              parsed.name = keyword.charAt(0).toUpperCase() + keyword.slice(1);
              if (keyword === 'vitamin' && lowerText.includes('d')) {
                parsed.name = 'Vitamin D';
              }
              break;
            }
          }
          if (!parsed.name || parsed.name.trim() === '') {
            parsed.name = 'Medication';
          }
        }
        
        // Ensure we have at least one reminder time
        if (!parsed.reminderTimes || parsed.reminderTimes.length === 0) {
          parsed.reminderTimes = ['08:00']; // Default to morning
        }
        
        // Ensure we have a frequency
        if (!parsed.frequency || parsed.frequency.trim() === '') {
          parsed.frequency = 'Daily';
        }
        
        // Ensure we have a dosage
        if (!parsed.dosage || parsed.dosage.trim() === '') {
          parsed.dosage = 'As prescribed';
        }
      }
      
      res.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiText.substring(0, 200));
      // Fallback response
      res.json({
        success: false,
        message: 'Unable to parse medication reminder information. Please try again or use the form.',
        name: null,
        dosage: null,
        frequency: null,
        reminderTimes: []
      });
    }
  } catch (error) {
    console.error('Medication reminder parsing error:', error);
    res.json({ 
      success: false,
      message: 'Unable to process medication reminder. Please try again or use the form.',
      name: null,
      dosage: null,
      frequency: null,
      reminderTimes: []
    });
  }
});

// ElevenLabs Voices endpoint - List available voices
app.get('/api/elevenlabs/voices', async (req, res) => {
  try {
    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to server/.env file.' 
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const response = await fetchWithTimeout('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey,
      },
    }, 10000); // 10 seconds for voices list

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs voices API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid ElevenLabs API key' });
      }
      return res.status(response.status).json({ 
        error: `ElevenLabs API error: ${response.statusText}` 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      details: error.message 
    });
  }
});

// ElevenLabs Text-to-Speech endpoint
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text, voice_id, model_id } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided for speech synthesis' });
    }

    // Check if ElevenLabs API key is configured
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.trim() === '') {
      console.warn('ElevenLabs API key not configured');
      return res.status(503).json({ 
        error: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to server/.env file.' 
      });
    }

    // Default voice and model settings
    // Using latest ElevenLabs models: eleven_turbo_v2 (fast) or eleven_multilingual_v2 (multilingual)
    // Handle undefined/null values properly
    const envVoiceId = process.env.ELEVENLABS_VOICE_ID;
    const defaultVoiceId = 'g6xIsTj2HwM6VR4iXFCw';
    
    const voiceId = (voice_id && voice_id !== 'undefined' && voice_id !== 'null') 
      ? voice_id 
      : (envVoiceId || defaultVoiceId);
    const modelId = (model_id && model_id !== 'undefined' && model_id !== 'null')
      ? model_id
      : (process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2'); // Latest fast model
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log(`[ElevenLabs TTS] Request voice_id: ${voice_id || 'none'}, Env ELEVENLABS_VOICE_ID: ${envVoiceId || 'not set'}, Using voice: ${voiceId}`);
    console.log(`Generating speech using ElevenLabs: voice=${voiceId}, model=${modelId}, text="${text.substring(0, 50)}..."`);

    // Call ElevenLabs API v1
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetchWithTimeout(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }, 20000); // 20 seconds for TTS generation

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        // Try to parse as JSON for better error messages
        try {
          const errorJson = JSON.parse(errorText);
          errorText = errorJson.detail?.message || errorJson.message || errorText;
        } catch (e) {
          // Not JSON, use as-is
        }
      } catch (e) {
        errorText = response.statusText;
      }
      
      console.error('ElevenLabs API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid ElevenLabs API key',
          details: 'Please check your ELEVENLABS_API_KEY in server/.env file'
        });
      } else if (response.status === 429) {
        return res.status(429).json({ 
          error: 'ElevenLabs API quota exceeded',
          details: 'You have reached your monthly character limit. Please upgrade your plan or wait for quota reset.'
        });
      } else if (response.status === 422) {
        return res.status(422).json({ 
          error: 'Invalid request to ElevenLabs API',
          details: errorText || 'Check voice_id and model_id parameters'
        });
      } else {
        return res.status(response.status).json({ 
          error: `ElevenLabs API error: ${response.statusText}`,
          details: errorText
        });
      }
    }

    // Get audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Received empty audio buffer from ElevenLabs');
    }
    
    // Convert to base64 for sending to client
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    console.log(`Successfully generated speech: ${audioBuffer.byteLength} bytes`);

    res.json({
      audio: audioBase64,
      format: 'mp3',
      mimeType: 'audio/mpeg',
    });
  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
    });
  }
});

// Health Services Nearby endpoint
app.get('/api/health-services', async (req, res) => {
  try {
    console.log('[Health Services] Request received:', { 
      latitude: req.query.latitude, 
      longitude: req.query.longitude,
      query: req.query 
    });
    
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      console.log('[Health Services] Missing parameters');
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ 
        error: 'Invalid latitude or longitude values' 
      });
    }

    // Check if Google Places API key is configured
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (googlePlacesApiKey && googlePlacesApiKey.trim() !== '') {
      // Use Google Places API (New) to find nearby health services
      try {
        // New Places API endpoint - uses POST request
        const placesUrl = `https://places.googleapis.com/v1/places:searchNearby`;
        
        const requestBody = {
          includedTypes: ['hospital', 'pharmacy'],
          maxResultCount: 10,
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng
              },
              radius: 5000.0 // 5km in meters
            }
          }
        };

        const placesResponse = await fetchWithTimeout(placesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googlePlacesApiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.formattedAddress,places.location,places.rating,places.regularOpeningHours,places.regularSecondaryOpeningHours'
          },
          body: JSON.stringify(requestBody)
        }, 10000); // 10 seconds for Places API

        const placesData = await placesResponse.json();

        console.log('[Health Services] Places API (New) response status:', placesResponse.status);
        if (!placesResponse.ok) {
          console.error('[Health Services] Places API (New) error response:', placesData);
        }

        if (placesResponse.ok && placesData.places && placesData.places.length > 0) {
          // Use data directly from searchNearby - no additional API calls needed for better performance
          // The searchNearby API already returns opening hours, so we don't need separate Place Details calls
          const placesWithDetails = placesData.places.slice(0, 10);
          
          // Calculate distance and format results
          const services = placesWithDetails.map((place, index) => {
            // Calculate distance using Haversine formula
            const placeLat = place.location?.latitude || lat;
            const placeLng = place.location?.longitude || lng;
            const distanceKm = calculateDistance(lat, lng, placeLat, placeLng);
            const distanceMi = (distanceKm * 0.621371).toFixed(1);
            
            // Extract opening hours from Google Places API
            // Prefer secondary hours (e.g., pharmacy hours) if available, otherwise use regular hours
            const secondaryHours = place.regularSecondaryOpeningHours?.[0]; // First secondary hours set
            const openingHours = secondaryHours || place.regularOpeningHours;
            const isOpenNow = openingHours?.openNow || false;
            const weekdayDescriptions = openingHours?.weekdayDescriptions || [];
            const periods = openingHours?.periods || [];
            
            // If we used secondary hours, also check regular hours for openNow status
            const regularOpeningHours = place.regularOpeningHours;
            const finalIsOpenNow = secondaryHours ? (secondaryHours?.openNow || regularOpeningHours?.openNow) : isOpenNow;
            
            // Format hours string using exact hours from Google Maps
            let hoursString = 'Hours vary';
            
            if (weekdayDescriptions.length > 0) {
              // Check if all days show "Open 24 hours" - this is more reliable
              const all24Hours = weekdayDescriptions.every(desc => 
                desc.toLowerCase().includes('open 24 hours') || 
                desc.toLowerCase().includes('24 hours')
              );
              
              // Check periods data to verify 24-hour operation
              let periodsIndicate24Hours = false;
              if (periods.length > 0) {
                // Check if there's a period that spans midnight (indicates 24 hours)
                // 24-hour places typically have: open at 00:00, close at 00:00 next day
                periodsIndicate24Hours = periods.some(p => {
                  if (!p.close) return false; // Need close time
                  const openDay = p.open?.day;
                  const closeDay = p.close?.day;
                  // Check if it's open at midnight and closes at midnight next day
                  return p.open?.hour === 0 && p.open?.minute === 0 && 
                         closeDay === ((openDay + 1) % 7) &&
                         p.close?.hour === 0 && p.close?.minute === 0;
                });
                
                // Also check if all days have periods covering full 24 hours
                if (!periodsIndicate24Hours && periods.length >= 7) {
                  const allDaysHave24HourPeriods = [0,1,2,3,4,5,6].every(day => {
                    return periods.some(p => {
                      if (p.open?.day !== day || !p.close) return false;
                      const openMinutes = p.open.hour * 60 + p.open.minute;
                      const closeDay = p.close.day;
                      const closeMinutes = p.close.hour * 60 + p.close.minute;
                      // If close is next day and times are 00:00, it's 24 hours
                      if (closeDay === ((day + 1) % 7) && openMinutes === 0 && closeMinutes === 0) {
                        return true;
                      }
                      // Or if it covers most of the day (20+ hours)
                      const hoursOpen = closeDay === day ? 
                        (closeMinutes - openMinutes) / 60 :
                        ((24 * 60 - openMinutes) + closeMinutes) / 60;
                      return hoursOpen >= 20;
                    });
                  });
                  if (allDaysHave24HourPeriods) {
                    periodsIndicate24Hours = true;
                  }
                }
              }
              
              // Also check for known 24/7 chains (some may have incorrect API data)
              const placeName = (place.displayName?.text || '').toLowerCase();
              const isKnown24HourChain = placeName.includes('cvs pharmacy') || 
                                        (placeName.includes('cvs') && placeName.includes('pharmacy')) ||
                                        placeName.includes('walgreens pharmacy') ||
                                        placeName.includes('rite aid pharmacy');
              
              if (all24Hours || periodsIndicate24Hours || isKnown24HourChain) {
                // If all days are 24 hours, periods indicate 24 hours, or it's a known 24/7 chain
                hoursString = finalIsOpenNow ? 'Open now • Open 24 hours' : 'Open 24 hours';
              } else {
                // Use the exact formatted hours from Google Maps (weekdayDescriptions)
                const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
                const todayIndex = today === 0 ? 6 : today - 1; // Convert to Monday=0 format (API uses Monday=0)
                const todayHours = weekdayDescriptions[todayIndex] || weekdayDescriptions[0];
                
                if (todayHours) {
                  // Remove day name prefix (e.g., "Monday: " or "Saturday: ")
                  const hoursOnly = todayHours.replace(/^[^:]+:\s*/, '');
                  
                  if (finalIsOpenNow) {
                    hoursString = `Open now • ${hoursOnly}`;
                  } else {
                    // Show today's exact hours
                    hoursString = hoursOnly;
                  }
                }
              }
            } else if (periods.length > 0) {
              // Check if periods indicate 24-hour operation (open at 0:00, close at 0:00 next day)
              const is24Hours = periods.some(p => 
                p.open?.hour === 0 && p.open?.minute === 0 && 
                p.close?.day === ((p.open?.day + 1) % 7) && 
                p.close?.hour === 0 && p.close?.minute === 0
              );
              
              if (is24Hours) {
                hoursString = finalIsOpenNow ? 'Open now • Open 24 hours' : 'Open 24 hours';
              } else {
                // Fallback: Format hours from periods data if weekdayDescriptions not available
                const today = new Date().getDay();
                const todayPeriods = periods.filter(p => p.open?.day === today);
                
                if (todayPeriods.length > 0) {
                  const formattedTimes = todayPeriods.map(p => {
                    const openTime = formatTime(p.open.hour, p.open.minute);
                    const closeTime = formatTime(p.close.hour, p.close.minute);
                    return `${openTime} – ${closeTime}`;
                  }).join(', ');
                  
                  if (finalIsOpenNow) {
                    hoursString = `Open now • ${formattedTimes}`;
                  } else {
                    hoursString = formattedTimes;
                  }
                } else if (finalIsOpenNow) {
                  hoursString = 'Open now';
                }
              }
            } else if (finalIsOpenNow) {
              hoursString = 'Open now';
            }
            
            return {
              id: place.id || `place_${index + 1}`,
              name: place.displayName?.text || 'Health Service',
              type: getServiceType(place.types || []),
              distance: `${distanceMi} mi`,
              hours: hoursString,
              address: place.formattedAddress || 'Address not available',
              rating: place.rating,
              lat: placeLat,
              lng: placeLng,
            };
          });

          console.log('[Health Services] Returning', services.length, 'services from Places API (New)');
          return res.json({ services });
        } else {
          console.log('[Health Services] Places API (New) - no places found or error');
          console.log('[Health Services] Response status:', placesResponse.status);
          console.log('[Health Services] Response data:', JSON.stringify(placesData, null, 2));
          // If error, log it but fall through to sample data
          if (placesData.error) {
            console.error('[Health Services] Places API (New) error:', JSON.stringify(placesData.error, null, 2));
          }
        }
      } catch (placesError) {
        console.error('[Health Services] Google Places API (New) exception:', placesError);
        console.error('[Health Services] Error stack:', placesError.stack);
        // Fall through to fallback data
      }
    }

    // Fallback: Return sample data with calculated distances
    // This provides a good user experience even without Google Places API
    const sampleServices = [
      {
        id: 1,
        name: 'Springfield Medical Center',
        type: 'Hospital',
        hours: 'Open 24 hours',
        baseLat: lat + 0.01, // Approximate nearby location
        baseLng: lng + 0.01,
      },
      {
        id: 2,
        name: 'Community Health Clinic',
        type: 'Clinic',
        hours: 'Mon-Fri: 8 AM - 5 PM',
        baseLat: lat + 0.015,
        baseLng: lng - 0.01,
      },
      {
        id: 3,
        name: 'Riverside Urgent Care',
        type: 'Urgent Care',
        hours: 'Daily: 7 AM - 9 PM',
        baseLat: lat - 0.01,
        baseLng: lng + 0.015,
      },
    ];

    const services = sampleServices.map(service => {
      const distanceKm = calculateDistance(lat, lng, service.baseLat, service.baseLng);
      const distanceMi = (distanceKm * 0.621371).toFixed(1);
      
      return {
        id: service.id,
        name: service.name,
        type: service.type,
        distance: `${distanceMi} mi`,
        hours: service.hours,
        lat: service.baseLat,
        lng: service.baseLng,
      };
    });

    console.log('[Health Services] Returning', services.length, 'services');
    res.json({ services });
  } catch (error) {
    console.error('Health services error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health services',
      details: error.message 
    });
  }
});

// Helper function to format time from hour and minute (24-hour format to 12-hour format)
function formatTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to determine service type from Google Places types
// Handles both legacy API format (strings) and new API format (type strings)
function getServiceType(types) {
  if (!types || !Array.isArray(types)) return 'Health Service';
  
  // Convert to lowercase for comparison (handles both formats)
  const typesLower = types.map(t => typeof t === 'string' ? t.toLowerCase() : String(t).toLowerCase());
  
  // New Places API uses type strings like "hospital", "pharmacy", "doctor"
  // Legacy API uses strings like "hospital", "pharmacy", "doctor", "health", "medical"
  if (typesLower.some(t => t.includes('hospital'))) return 'Hospital';
  if (typesLower.some(t => t.includes('pharmacy'))) return 'Pharmacy';
  if (typesLower.some(t => t.includes('doctor') || t.includes('physician') || t.includes('physiotherapist'))) return 'Clinic';
  if (typesLower.some(t => t.includes('health') || t.includes('medical') || t.includes('clinic'))) return 'Medical Center';
  if (typesLower.some(t => t.includes('urgent') || t.includes('emergency'))) return 'Urgent Care';
  
  return 'Health Service';
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Whack 2025 API Server',
    version: '1.0.0',
      endpoints: {
        health: 'GET /api/health',
        diagnose: 'GET /api/diagnose',
        speechToText: 'POST /api/speech-to-text',
        aiQuery: 'POST /api/ai-query',
        textToSpeech: 'POST /api/text-to-speech',
        elevenLabsVoices: 'GET /api/elevenlabs/voices',
        healthServices: 'GET /api/health-services?latitude=...&longitude=...'
      }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Diagnostic endpoint to check configuration
app.get('/api/diagnose', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    server: {
      status: 'running',
      port: port,
    },
    configuration: {
      googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'Set' : 'Not set',
      openaiApiKey: process.env.OPENAI_API_KEY ? 
        (process.env.OPENAI_API_KEY.startsWith('sk-') ? 'Set (format looks valid)' : 'Set (format may be invalid)') : 
        'Not set',
      openaiModel: process.env.OPENAI_MODEL || `Using default (${DEFAULT_MODEL})`,
      geminiApiKey: process.env.GEMINI_API_KEY ? 
        (process.env.GEMINI_API_KEY.trim().length > 0 ? 'Set' : 'Not set') : 
        'Not set',
      geminiModel: process.env.GEMINI_MODEL || `Using default (${DEFAULT_GEMINI_MODEL})`,
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ? 
        (process.env.ELEVENLABS_API_KEY.trim().length > 0 ? 'Set' : 'Not set') : 
        'Not set',
      elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || 'Using default (g6xIsTj2HwM6VR4iXFCw)',
      elevenLabsModelId: process.env.ELEVENLABS_MODEL_ID || 'Using default (eleven_turbo_v2)',
    },
    tests: {
      speechClient: 'Not tested',
      openaiClient: 'Not tested',
      openaiApiConnection: 'Not tested',
      geminiClient: geminiClient ? 'Initialized' : 'Not initialized - API key not configured',
      geminiApiConnection: 'Not tested',
      elevenLabsConnection: 'Not tested',
    },
  };

  // Test Speech client initialization
  try {
    if (speechClient) {
      diagnostics.tests.speechClient = 'Initialized';
    }
  } catch (err) {
    diagnostics.tests.speechClient = `Error: ${err.message}`;
  }

  // Test OpenAI client initialization and API connectivity
  try {
    if (openai && process.env.OPENAI_API_KEY) {
      diagnostics.tests.openaiClient = 'Initialized';
      const testModelName = process.env.OPENAI_MODEL || DEFAULT_MODEL;
      
      // Test actual API call with a simple prompt
      try {
        const testResult = await openai.chat.completions.create({
          model: testModelName,
          messages: [
            {
              role: 'user',
              content: 'Say "test"'
            }
          ],
          max_tokens: 10,
        });
        const testText = testResult.choices[0]?.message?.content || '';
        diagnostics.tests.openaiClient = `Initialized - working model: ${testModelName}`;
        diagnostics.tests.openaiApiConnection = `Connected successfully using ${testModelName}. Response: "${testText.substring(0, 50)}"`;
      } catch (apiErr) {
        diagnostics.tests.openaiClient = `Initialized but API call failed`;
        diagnostics.tests.openaiApiConnection = `Cannot test - API call failed. Error: ${apiErr.message || 'Unknown'}`;
      }
    } else {
      diagnostics.tests.openaiClient = 'Not initialized - API key not configured';
      diagnostics.tests.openaiApiConnection = 'Cannot test - API key not configured';
    }
  } catch (err) {
    diagnostics.tests.openaiClient = `Error: ${err.message}`;
    diagnostics.tests.openaiApiConnection = `Cannot test - client initialization failed`;
  }

  // Test Gemini API connectivity
  try {
    if (geminiClient) {
      const testModelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      
      try {
        const testModel = geminiClient.getGenerativeModel({ model: testModelName });
        const testResult = await testModel.generateContent('Say "test"');
        // testResult.response is a property, not a promise - no await needed
        const testResponse = testResult.response;
        const testText = testResponse.text();
        diagnostics.tests.geminiClient = `Initialized - working model: ${testModelName}`;
        diagnostics.tests.geminiApiConnection = `Connected successfully using ${testModelName}. Response: "${testText.substring(0, 50)}"`;
      } catch (apiErr) {
        diagnostics.tests.geminiClient = `Initialized but API call failed`;
        diagnostics.tests.geminiApiConnection = `Cannot test - API call failed. Error: ${apiErr.message || 'Unknown'}`;
      }
    } else {
      diagnostics.tests.geminiClient = 'Not initialized - API key not configured';
      diagnostics.tests.geminiApiConnection = 'Cannot test - API key not configured';
    }
  } catch (err) {
    diagnostics.tests.geminiClient = `Error: ${err.message}`;
    diagnostics.tests.geminiApiConnection = `Cannot test - client initialization failed`;
  }

  // Test ElevenLabs API connectivity
  try {
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 0) {
      const testResponse = await fetchWithTimeout('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      }, 10000); // 10 seconds for diagnostic check
      
      if (testResponse.ok) {
        const voicesData = await testResponse.json();
        diagnostics.tests.elevenLabsConnection = `Connected successfully. Found ${voicesData.voices?.length || 0} voices.`;
      } else if (testResponse.status === 401) {
        diagnostics.tests.elevenLabsConnection = 'Connection failed - Invalid API key';
      } else {
        diagnostics.tests.elevenLabsConnection = `Connection failed - Status: ${testResponse.status}`;
      }
    } else {
      diagnostics.tests.elevenLabsConnection = 'Cannot test - API key not configured';
    }
  } catch (err) {
    diagnostics.tests.elevenLabsConnection = `Error: ${err.message}`;
  }

  res.json(diagnostics);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

