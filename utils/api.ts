// For Expo Go on physical device, use your computer's IP address instead of localhost
// Get your IP with: ifconfig | grep "inet " | grep -v 127.0.0.1
// Or check Expo dev tools - it shows the IP address
// Note: If IP changes, update EXPO_PUBLIC_API_BASE_URL in .env file
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';

// Helper to log current API URL for debugging
if (__DEV__) {
  console.log('[API] Using API_BASE_URL:', API_BASE_URL);
}

// Timeout settings (in milliseconds) - increased for slower networks
const DEFAULT_TIMEOUT = 30000; // 30 seconds for most requests (increased from 15s)
const LONG_TIMEOUT = 60000; // 60 seconds for speech-to-text and TTS (increased from 30s)

/**
 * Create a fetch request with timeout
 */
export function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return new Promise<Response>((resolve, reject) => {
    const timeoutErrorId = setTimeout(() => {
      controller.abort();
      clearTimeout(timeoutId);
      reject(new Error(`Request timeout (${timeout/1000} seconds). This may be a network connection issue or incorrect server address. Current server address: ${API_BASE_URL}`));
    }, timeout);
    
    fetch(url, { ...options, signal: controller.signal })
      .then(response => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutErrorId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        clearTimeout(timeoutErrorId);
        
        // Handle AbortError specifically
        if (error.name === 'AbortError' || error instanceof DOMException) {
          // Check if it was aborted due to timeout
          reject(new Error(`Request timeout (${timeout/1000} seconds). Unable to connect to ${API_BASE_URL}. Please check:\n1. Server is running (cd server && npm start)\n2. Network connection is working\n3. Server address is correct: ${API_BASE_URL}\n4. If using a device, ensure it's on the same network as the server`));
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
          reject(new Error(`Network error: Unable to connect to ${API_BASE_URL}. Please check:\n1. Server is running (cd server && npm start)\n2. Network connection is working\n3. Server address is correct: ${API_BASE_URL}\n4. If using a device, ensure it's on the same network as the server`));
        } else {
          reject(error);
        }
      });
  });
}

export interface SpeechToTextResponse {
  transcription: string;
  error?: string;
  service?: string;
  quotaExceeded?: boolean;
}

export interface AIQueryResponse {
  response: string;
  error?: string;
  service?: string;
  quotaExceeded?: boolean;
  errorType?: 'rate_limit' | 'quota' | null;
  suggestedRoutes?: string[]; // Array of page identifiers: 'events', 'volunteer', 'health'
}

export interface MedicationSuggestionResponse {
  suggestions: {
    medication: string;
    description: string;
    safetyNotes: string;
  }[];
  disclaimer: string;
}

export interface MedicationReminderParseResponse {
  success: boolean;
  message: string;
  name: string | null;
  dosage: string | null;
  frequency: string | null;
  reminderTimes: string[];
}

export interface TextToSpeechResponse {
  audio: string; // Base64 encoded audio
  format: string; // 'mp3' or 'wav'
  mimeType: string; // 'audio/mpeg' or 'audio/wav'
}

export interface HealthService {
  id: string | number;
  name: string;
  type: string;
  distance: string;
  hours: string;
  address?: string;
  rating?: number;
  lat?: number;
  lng?: number;
}

export interface HealthServicesResponse {
  services: HealthService[];
  error?: string;
}

/**
 * Send audio data to backend for speech-to-text conversion
 * @param audioData - Blob (web) or file URI string (React Native)
 */
export async function speechToText(
  audioData: Blob | string,
  format: string = 'WEBM_OPUS',
  sampleRate: number = 48000,
  languageCode: string = 'en-US',
  fileName: string = 'audio.webm'
): Promise<SpeechToTextResponse> {
  const formData = new FormData();
  
  // React Native FormData supports file URIs directly
  // Web FormData needs a Blob
  if (typeof audioData === 'string') {
    // React Native: file URI
    const mimeType = fileName.endsWith('.wav') ? 'audio/wav' : 'audio/m4a';
    formData.append('audio', {
      uri: audioData,
      type: mimeType,
      name: fileName,
    } as any);
  } else {
    // Web: Blob - FormData.append accepts 2 or 3 arguments depending on platform
    // @ts-ignore - React Native FormData has different signature than Web FormData
    formData.append('audio', audioData, fileName);
  }
  
  formData.append('format', format);
  formData.append('sampleRate', sampleRate.toString());
  formData.append('languageCode', languageCode);

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/speech-to-text`,
    {
      method: 'POST',
      body: formData,
    },
    LONG_TIMEOUT
  );

    if (!response.ok) {
    let errorMessage = 'Speech-to-text conversion failed';
    try {
      const error = await response.json();
      errorMessage = error.error || error.details || errorMessage;
    } catch (e) {
      errorMessage = `Server error: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Send text to AI for processing
 */
export async function queryAI(text: string): Promise<AIQueryResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/ai-query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    },
    LONG_TIMEOUT
  );

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.error || 'AI query processing failed') as any;
    error.service = errorData.service || 'OpenAI ChatGPT';
    error.quotaExceeded = errorData.quotaExceeded || false;
    error.errorType = errorData.errorType || null;
    throw error;
  }

  return response.json();
}

/**
 * Get medication suggestions based on symptoms
 */
export async function getMedicationSuggestions(symptoms: string): Promise<MedicationSuggestionResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/medication-suggestions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symptoms }),
    },
    DEFAULT_TIMEOUT
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get medication suggestions');
  }

  return response.json();
}

/**
 * Parse medication reminder information from voice input
 */
export async function parseMedicationReminder(text: string): Promise<MedicationReminderParseResponse> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/parse-medication-reminder`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    },
    LONG_TIMEOUT
  );

  // Clone response to check content type without consuming body
  const contentType = response.headers.get('content-type') || '';
  
  // Check if response is HTML (error page) instead of JSON
  if (!contentType.includes('application/json')) {
    const errorText = await response.text();
    console.error('[API] Non-JSON response received:', errorText.substring(0, 200));
    
    if (response.status === 404) {
      throw new Error(`Medication reminder parsing endpoint not found (404). Make sure:\n1. The server is running: cd server && npm start\n2. The route exists at ${API_BASE_URL}/api/parse-medication-reminder`);
    }
    throw new Error(`Server returned HTML instead of JSON (${response.status}). The server may not be running or the endpoint doesn't exist. Check: ${API_BASE_URL}/api/parse-medication-reminder`);
  }

  // Response is JSON, try to parse it
  try {
    const data = await response.json();
    
    if (!response.ok) {
      // Response is JSON but status is not OK
      throw new Error(data.error || `Failed to parse medication reminder (${response.status})`);
    }
    
    return data;
  } catch (parseError: any) {
    // If JSON parsing fails, provide helpful error
    if (parseError.message && parseError.message.includes('JSON')) {
      console.error('[API] JSON parse error:', parseError);
      throw new Error('Server returned invalid JSON. The server may have encountered an error. Please check the server logs.');
    }
    // Re-throw if it's already our error
    throw parseError;
  }
}

/**
 * Generate speech using ElevenLabs TTS API
 * @param text - Text to convert to speech
 * @param voiceId - Optional voice ID (defaults to server default)
 * @param modelId - Optional model ID (defaults to server default)
 */
/**
 * Check if the ElevenLabs TTS endpoint is available
 */
export async function checkElevenLabsAvailability(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/health`,
      { method: 'GET' },
      5000 // 5 seconds for health check
    );
    return response.ok;
  } catch (error) {
    console.warn('[API] Server health check failed:', error);
    return false;
  }
}

/**
 * Generate speech using ElevenLabs TTS API
 * @param text - Text to convert to speech
 * @param voiceId - Optional voice ID (defaults to server default)
 * @param modelId - Optional model ID (defaults to server default)
 */
export async function generateSpeech(
  text: string,
  voiceId?: string,
  modelId?: string
): Promise<TextToSpeechResponse> {
  const url = `${API_BASE_URL}/api/text-to-speech`;
  
  // Only include voice_id and model_id if they are defined
  const requestBody: any = { text };
  if (voiceId) {
    requestBody.voice_id = voiceId;
  }
  if (modelId) {
    requestBody.model_id = modelId;
  }
  
  console.log('[API] Calling ElevenLabs TTS:', url);
  console.log('[API] Request body:', { text: text.substring(0, 50) + '...', ...requestBody });
  
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      LONG_TIMEOUT
    );

    console.log('[API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();
      let errorMessage = 'Failed to generate speech';
      let errorDetails = '';
      
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        errorDetails = error.details || '';
        console.error('[API] Error response:', error);
      } catch (e) {
        // If JSON parsing fails, try text
        try {
          const errorText = await responseClone.text();
          console.error('[API] Error text:', errorText);
          // Try to parse as HTML and extract error message
          if (errorText.includes('<pre>')) {
            const match = errorText.match(/<pre>(.*?)<\/pre>/);
            errorMessage = match ? match[1] : `HTTP ${response.status}: ${response.statusText}`;
          } else {
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (textError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      
      // Provide more helpful error messages
      if (response.status === 503) {
        throw new Error('ElevenLabs API key not configured on server. Please add ELEVENLABS_API_KEY to server/.env file.');
      } else if (response.status === 401) {
        throw new Error('Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY in server/.env file.');
      } else if (response.status === 429) {
        const error = new Error('ElevenLabs API quota exceeded. You have reached your monthly character limit.') as any;
        error.service = 'ElevenLabs Text-to-Speech';
        error.quotaExceeded = true;
        throw error;
      } else if (response.status === 404) {
        throw new Error(`Server endpoint not found at ${url}. Make sure:\n1. The server is running (cd server && npm start)\n2. The route /api/text-to-speech exists\n3. The API_BASE_URL is correct (currently: ${API_BASE_URL})`);
      }
      
      const fullError = errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage;
      throw new Error(fullError);
    }

    const result = await response.json();
    
    if (!result.audio || result.audio.trim().length === 0) {
      throw new Error('Received empty audio response from ElevenLabs');
    }
    
    console.log('[API] Successfully received audio response (base64 length:', result.audio.length, ')');
    return result;
  } catch (error: any) {
    console.error('[API] Fetch error:', error);
    if (error instanceof TypeError || error.name === 'AbortError') {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.name === 'AbortError') {
        const errorMsg = error.message || 'Unable to connect to server';
        throw new Error(`${errorMsg}\n\nPlease check:\n1. Server is running (cd server && npm start)\n2. Network connection is working\n3. Server address is correct: ${API_BASE_URL}\n4. If you changed networks/location, you may need to update the IP address`);
      }
    }
    throw error;
  }
}

/**
 * Fetch nearby health services based on user's location
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 */
export async function getHealthServices(
  latitude: number,
  longitude: number
): Promise<HealthServicesResponse> {
  const url = `${API_BASE_URL}/api/health-services?latitude=${latitude}&longitude=${longitude}`;
  
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      DEFAULT_TIMEOUT
    );

    // Clone response to check content type without consuming body
    const contentType = response.headers.get('content-type') || '';
    
    // Check if response is HTML (error page) instead of JSON
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('[API] Non-JSON response received:', text.substring(0, 200));
      
      if (response.status === 404) {
        throw new Error(`Health services endpoint not found (404). Make sure:\n1. The server is running: cd server && npm start\n2. The route exists at ${url}`);
      }
      throw new Error(`Server returned HTML instead of JSON (${response.status}). The server may not be running or the endpoint doesn't exist. Check: ${API_BASE_URL}/api/health-services`);
    }

    if (!response.ok) {
      // Response is JSON but status is not OK
      const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status} ${response.statusText}` }));
      throw new Error(errorData.error || `Failed to fetch health services (${response.status})`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[API] Error fetching health services:', error);
    
    // Handle network errors and timeouts
    if (error instanceof TypeError || error.name === 'AbortError') {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.name === 'AbortError' || error.message.includes('timeout')) {
        const errorMsg = error.message || 'Unable to connect to server';
        throw new Error(`${errorMsg}\n\nPlease check:\n1. Server is running (cd server && npm start)\n2. Network connection is working\n3. Server address is correct: ${API_BASE_URL}\n4. If you changed networks/location, you may need to update the IP address`);
      }
    }
    
    // Handle JSON parse errors (usually means HTML was returned)
    if (error.message && (error.message.includes('JSON Parse error') || error.message.includes('Unexpected token'))) {
      throw new Error(`Server returned an invalid response. Please check:\n1. Server is running: cd server && npm start\n2. Endpoint exists: ${API_BASE_URL}/api/health-services\n3. Check server logs`);
    }
    
    throw error;
  }
}

