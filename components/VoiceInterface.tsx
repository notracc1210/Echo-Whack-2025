import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { WebAudioRecorder, isAudioRecordingSupported } from '../utils/audioRecorder';
import { speechToText, queryAI } from '../utils/api';

interface VoiceInterfaceProps {
  isListening: boolean;
  onToggleListening: (listening: boolean) => void;
  onCommand: (command: string) => void;
}

export function VoiceInterface({ isListening, onToggleListening, onCommand }: VoiceInterfaceProps) {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<WebAudioRecorder | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recorderRef.current?.isRecording()) {
        recorderRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleVoiceToggle = async () => {
    if (!isListening) {
      // Check if audio recording is supported
      if (!isAudioRecordingSupported()) {
        setError('Audio recording is not supported in your browser');
        return;
      }

      try {
        setError(null);
        onToggleListening(true);
        
        // Start recording
        const recorder = new WebAudioRecorder();
        recorderRef.current = recorder;
        await recorder.start();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start recording');
        onToggleListening(false);
      }
    } else {
      // Stop recording and process
      if (recorderRef.current?.isRecording()) {
        try {
          setIsProcessing(true);
          const audioBlob = await recorderRef.current.stop();
          
          // Convert speech to text
          const { transcription } = await speechToText(audioBlob);
          setTranscript(transcription);
          
          // Send to AI
          try {
            const { response: aiResponse } = await queryAI(transcription);
            // You can use aiResponse here if needed
            console.log('AI Response:', aiResponse);
          } catch (aiError) {
            console.error('AI query error:', aiError);
            // Continue even if AI query fails
          }
          
          // Pass transcription to parent component
          onCommand(transcription);
          onToggleListening(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process audio');
          onToggleListening(false);
        } finally {
          setIsProcessing(false);
          recorderRef.current = null;
        }
      } else {
        onToggleListening(false);
      }
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl p-8 bg-white flex flex-col items-center gap-6">
          {/* Voice Button */}
          <button
            onClick={handleVoiceToggle}
            className={`
              w-36 h-36 rounded-full flex items-center justify-center
              transition-all duration-300 shadow-lg
              ${isProcessing 
                ? 'bg-blue-400 cursor-wait' 
                : isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600'
              }
            `}
            disabled={isProcessing}
            aria-label={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isListening ? (
              <MicOff className="w-16 h-16 text-white" />
            ) : (
              <Mic className="w-16 h-16 text-white" />
            )}
          </button>

          {/* Status Text */}
          <div className="text-center">
            {isProcessing ? (
              <p className="text-gray-900 text-2xl">Processing...</p>
            ) : isListening ? (
              <p className="text-gray-900 text-2xl">Listening...</p>
            ) : transcript ? (
              <p className="text-gray-600 text-xl">"{transcript}"</p>
            ) : (
              <p className="text-gray-600 text-3xl font-bold">Tap to speak</p>
            )}
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>

        {/* Suggestion Chips */}
        {!isListening && !transcript && (
          <div className="flex flex-wrap gap-3 justify-center">
            <button 
              onClick={() => {
                setTranscript("I want to take a walk today");
                onCommand("I want to take a walk today");
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors text-lg"
            >
              "I want to take a walk"
            </button>
            <button 
              onClick={() => {
                setTranscript("Find exercise classes");
                onCommand("Find exercise classes");
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors text-lg"
            >
              "Find exercise classes"
            </button>
            <button 
              onClick={() => {
                setTranscript("Social activities near me");
                onCommand("Social activities near me");
              }}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors text-lg"
            >
              "Social activities"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}