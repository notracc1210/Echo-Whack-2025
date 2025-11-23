/**
 * Audio recording utilities for React Native using expo-av
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface AudioRecorder {
  start: () => Promise<void>;
  stop: () => Promise<{ uri: string; size: number }>;
  isRecording: () => boolean;
}

export class NativeAudioRecorder implements AudioRecorder {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;
  private recordingStatus: boolean = false;

  async start(): Promise<void> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording in LINEAR16 (PCM) format for Google Cloud Speech-to-Text compatibility
      // LINEAR16 is natively supported by Google Cloud Speech-to-Text
      const { recording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT, // Will use PCM
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 16000, // Use 16kHz for better compatibility
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 16000, // Use 16kHz for better compatibility
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        },
        (status) => {
          // Handle status updates if needed
        }
      );

      this.recording = recording;
      this.recordingStatus = true;
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stop(): Promise<{ uri: string; size: number }> {
    if (!this.recording || !this.recordingStatus) {
      throw new Error('Recording not started');
    }

    try {
      // Stop recording
      await this.recording.stopAndUnloadAsync();
      this.recordingStatus = false;

      // Get the URI
      const uri = this.recording.getURI();
      if (!uri) {
        throw new Error('Recording URI not available');
      }

      this.recordingUri = uri;

      console.log(`Reading audio file from: ${uri}`);

      // Read file info to validate and get size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file does not exist');
      }

      const fileSize = fileInfo.size || 0;
      if (fileSize === 0) {
        throw new Error('Recording file is empty');
      }

      console.log(`Audio recording completed: ${fileSize} bytes`);

      // Don't cleanup immediately - let the upload handle it
      // Return the URI for React Native FormData to use directly
      this.recording = null;

      return { uri, size: fileSize };
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isRecording(): boolean {
    return this.recordingStatus;
  }
}

