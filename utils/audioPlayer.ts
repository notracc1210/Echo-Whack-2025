/**
 * Audio Player Utility
 * 
 * Handles audio playback using expo-av with support for:
 * - ElevenLabs TTS audio (base64 MP3)
 * - Audio queuing for multiple messages
 * - Fallback to local TTS if ElevenLabs fails
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { generateSpeech, TextToSpeechResponse } from './api';

// Audio queue for sequential playback
let audioQueue: string[] = [];
let isPlayingQueue = false;
let currentSound: Audio.Sound | null = null;

/**
 * Play audio from base64 string (ElevenLabs TTS)
 */
async function playBase64Audio(audioBase64: string, mimeType: string): Promise<void> {
  try {
    console.log('[TTS] Playing ElevenLabs audio (base64 length:', audioBase64.length, ')');
    
    // Ensure audio mode is set for maximum volume before playing
    await initializeAudio();
    
    // Create a temporary file for the audio
    const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
    
    // Write base64 to file
    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('[TTS] Audio file created:', fileUri);

    // Load and play audio with maximum volume settings
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { 
        shouldPlay: true, 
        volume: 1.0,
        isMuted: false,
      }
    );

    // Explicitly set volume to maximum to ensure loud playback
    await sound.setVolumeAsync(1.0);
    
    // Ensure audio is not muted
    await sound.setIsMutedAsync(false);
    
    // Set playback rate to slower speed (0.85 = 85% speed, making it slower)
    await sound.setRateAsync(0.85, true); // true = respect audio pitch

    currentSound = sound;
    console.log('[TTS] Audio playback started at slower rate (0.85x)');

    // Wait for playback to finish
    return new Promise((resolve, reject) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            console.log('[TTS] ElevenLabs audio playback finished');
            sound.unloadAsync().catch(console.error);
            currentSound = null;
            
            // Clean up temporary file
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(console.error);
            
            resolve();
          }
        } else if (status.error) {
          console.error('[TTS] Audio playback error:', status.error);
          sound.unloadAsync().catch(console.error);
          currentSound = null;
          FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(console.error);
          reject(new Error(status.error));
        }
      });
    });
  } catch (error) {
    console.error('[TTS] Error playing base64 audio:', error);
    throw error;
  }
}

/**
 * Play audio using local TTS (fallback)
 */
async function playLocalTTS(text: string): Promise<void> {
  console.warn('[TTS] Using LOCAL TTS (fallback) - ElevenLabs is not being used!');
  
  // Ensure audio mode is set for maximum volume before playing
  await initializeAudio();
  
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.85, // Slower for clarity, especially for elderly users
      volume: 1.0, // Maximum volume for loud playback
      onDone: () => {
        console.log('[TTS] Local TTS playback finished');
        resolve();
      },
      onStopped: () => {
        console.log('[TTS] Local TTS playback stopped');
        resolve();
      },
      onError: (error) => {
        console.error('[TTS] Local TTS error:', error);
        reject(error);
      },
    });
  });
}

/**
 * Process audio queue sequentially
 */
async function processAudioQueue(): Promise<void> {
  if (isPlayingQueue || audioQueue.length === 0) {
    return;
  }

  isPlayingQueue = true;

  while (audioQueue.length > 0) {
    const audioData = audioQueue.shift();
    if (!audioData) continue;

    try {
      const data = JSON.parse(audioData);
      
      if (data.type === 'base64') {
        await playBase64Audio(data.audio, data.mimeType);
      } else if (data.type === 'text') {
        await playLocalTTS(data.text);
      }
    } catch (error) {
      console.error('Error playing queued audio:', error);
      // Continue with next item in queue
    }
  }

  isPlayingQueue = false;
}

/**
 * Generate speech using ElevenLabs and play it automatically
 * Falls back to local TTS if ElevenLabs fails
 */
export async function playTextToSpeech(text: string): Promise<void> {
  if (!text || text.trim().length === 0) {
    return;
  }

  console.log('[TTS] Attempting to generate speech with ElevenLabs...');
  
  try {
    // Try ElevenLabs first
    const response: TextToSpeechResponse = await generateSpeech(text);
    
    if (!response.audio || response.audio.trim().length === 0) {
      throw new Error('Empty audio response from ElevenLabs');
    }
    
    console.log('[TTS] ElevenLabs audio generated successfully, length:', response.audio.length);
    
    // Add to queue for sequential playback
    audioQueue.push(JSON.stringify({
      type: 'base64',
      audio: response.audio,
      mimeType: response.mimeType,
    }));

    // Start processing queue if not already playing
    if (!isPlayingQueue) {
      processAudioQueue().catch(console.error);
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TTS] ElevenLabs TTS failed:', errorMessage);
    console.error('[TTS] Full error:', error);
    
    // Check if it's a quota error and show alert
    if (error?.quotaExceeded || errorMessage.includes('quota') || errorMessage.includes('429')) {
      const serviceName = error?.service || 'ElevenLabs Text-to-Speech';
      // Import Alert dynamically to avoid issues
      if (typeof window !== 'undefined' && (window as any).alert) {
        (window as any).alert(`${serviceName} quota exceeded\n\n${errorMessage}\n\nWill use local text-to-speech instead.`);
      } else {
        // For React Native, we'll need to handle this differently
        console.warn(`[TTS] ${serviceName} quota exceeded:`, errorMessage);
      }
    }
    
    console.warn('[TTS] Falling back to local TTS');
    
    // Fallback to local TTS
    audioQueue.push(JSON.stringify({
      type: 'text',
      text: text,
    }));

    // Start processing queue if not already playing
    if (!isPlayingQueue) {
      processAudioQueue().catch(console.error);
    }
  }
}

/**
 * Stop all audio playback
 */
export async function stopAudioPlayback(): Promise<void> {
  // Stop current sound if playing
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }

  // Stop local TTS if playing
  Speech.stop();

  // Clear queue
  audioQueue = [];
  isPlayingQueue = false;
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  return isPlayingQueue || currentSound !== null;
}

/**
 * Initialize audio mode for playback
 */
export async function initializeAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false, // Don't duck other apps - ensures our audio plays at full volume
      playThroughEarpieceAndroid: false, // Use speaker instead of earpiece for maximum volume
      interruptionModeIOS: InterruptionModeIOS.DoNotMix, // Don't mix with other audio - ensures maximum volume
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix, // Don't mix with other audio - ensures maximum volume
    });
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

