import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { NativeAudioRecorder } from '../utils/audioRecorder.native';
import { speechToText, queryAI } from '../utils/api';

interface VoiceButtonProps {
  onCommand: (command: string) => void;
  label?: string;
  size?: 'large' | 'medium';
}

export function VoiceButton({ onCommand, label = 'Tap to speak', size = 'large' }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<NativeAudioRecorder | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recorderRef.current?.isRecording()) {
        recorderRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleVoiceToggle = async () => {
    if (isProcessing) return; // Don't allow toggling while processing
    
    if (!isListening) {
      // Start recording
      try {
        setError(null);
        setIsListening(true);
        
        const recorder = new NativeAudioRecorder();
        recorderRef.current = recorder;
        await recorder.start();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
        setError(errorMessage);
        Alert.alert('Recording Error', errorMessage);
        setIsListening(false);
      }
    } else {
      // Stop recording and process
      if (recorderRef.current?.isRecording()) {
        try {
          setIsProcessing(true);
          setIsListening(false); // Stop listening state immediately
          const audioData = await recorderRef.current.stop();
          
          // Validate audio data before sending
          if (!audioData || !audioData.uri || audioData.size === 0) {
            throw new Error('Recording is empty. Please try again.');
          }
          
          console.log(`Sending audio: ${audioData.size} bytes from ${audioData.uri}`);
          
          // Convert speech to text (LINEAR16/WAV format for React Native - PCM encoding)
          // Pass the file URI directly - React Native FormData supports file URIs
          const { transcription } = await speechToText(audioData.uri, 'LINEAR16', 16000, 'en-US', 'audio.wav');
          
          // Cleanup recording file after successful upload
          try {
            await FileSystem.deleteAsync(audioData.uri, { idempotent: true });
          } catch (cleanupError) {
            console.warn('Failed to cleanup recording file:', cleanupError);
          }
          
          // Send to AI
          try {
            const aiResult = await queryAI(transcription);
            // You can use aiResult.response here if needed
            console.log('AI Response:', aiResult.response);
            
            // Check if there's a quota error
            if (aiResult.quotaExceeded) {
              const serviceName = aiResult.service || 'AI Service';
              const errorType = aiResult.errorType === 'rate_limit' ? 'rate limit' : 'quota exceeded';
              setError(`${serviceName} ${errorType}`);
              Alert.alert(
                'Quota Exceeded',
                `${serviceName} encountered ${errorType}.\n\n${aiResult.error || 'Please try again later or check your account quota.'}`,
                [{ text: 'OK' }]
              );
            }
          } catch (aiError: any) {
            console.error('AI query error:', aiError);
            // Check if it's a quota error from the response
            if (aiError.response) {
              try {
                const errorData = await aiError.response.json();
                if (errorData.quotaExceeded) {
                  const serviceName = errorData.service || 'AI Service';
                  const errorType = errorData.errorType === 'rate_limit' ? 'rate limit' : 'quota exceeded';
                  setError(`${serviceName} ${errorType}`);
                  Alert.alert(
                    'Quota Exceeded',
                    `${serviceName} encountered ${errorType}.\n\n${errorData.error || 'Please try again later or check your account quota.'}`,
                    [{ text: 'OK' }]
                  );
                  return; // Don't continue processing
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
            // Continue even if AI query fails (for non-quota errors)
          }
          
          // Pass transcription to parent component
          onCommand(transcription);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process audio';
          console.error('Voice processing error:', err);
          setError(errorMessage);
          // Show more helpful error messages
          let alertMessage = errorMessage;
          let alertTitle = 'Processing Error';
          
          // Check if it's a quota error from Google Cloud Speech-to-Text
          if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            alertTitle = 'Quota Exceeded';
            alertMessage = 'Google Cloud Speech-to-Text quota exceeded.\n\nPlease check Google Cloud Console quotas or try again later.';
            setError('Google Cloud Speech-to-Text quota exceeded');
          } else if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
            alertMessage = 'Network error. Please check connection and ensure server is running.';
          } else if (errorMessage.includes('Permission')) {
            alertMessage = 'Permission denied. Please check Google Cloud settings.';
          } else if (errorMessage.includes('No speech detected')) {
            alertMessage = 'No speech detected. Please speak again.';
          }
          Alert.alert(alertTitle, alertMessage);
        } finally {
          setIsProcessing(false);
          recorderRef.current = null;
        }
      } else {
        setIsListening(false);
      }
    }
  };

  const buttonSize = size === 'large' ? 180 : 120;
  const iconSize = size === 'large' ? 96 : 56;
  const backgroundColor = isListening ? '#ef4444' : isProcessing ? '#60a5fa' : '#3b82f6';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleVoiceToggle}
        disabled={isProcessing}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor,
          },
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <MaterialIcons
            name={isListening ? 'mic-off' : 'mic'}
            size={iconSize}
            color="#ffffff"
          />
        )}
      </TouchableOpacity>

      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {isProcessing ? 'Processing...' : isListening ? 'Listening...' : label}
        </Text>
      </View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  labelContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  label: {
    color: '#4b5563',
    fontSize: 28,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
