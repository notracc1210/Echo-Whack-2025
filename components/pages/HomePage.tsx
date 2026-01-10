import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { Page } from '../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Linking from 'expo-linking';

interface HomePageProps {
  onNavigate: (page: Page) => void;
  onVoiceCommand: (command: string) => void;
}

export function HomePage({ onNavigate, onVoiceCommand }: HomePageProps) {
  const insets = useSafeAreaInsets();
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [textInput, setTextInput] = useState('');

  /**
   * Handle 911 Emergency button press
   */
  const handleEmergencyCall = () => {
    Linking.openURL('tel:911');
  };

  
  return (
    <View style={styles.container}>
      {/* Header with 911 Emergency Button */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(16, insets.top + 16) }]}>
        <View style={styles.emergencyButtonContainer}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyCall}
            activeOpacity={0.8}
          >
            <MaterialIcons name="local-phone" size={32} color="#ffffff" />
            <Text style={styles.emergencyButtonText}>911 Emergency</Text>
          </TouchableOpacity>
        </View>
      </View>


      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(32, insets.bottom + 32) }
        ]}
      >
      {/* Voice Button - Directly Below 911 */}
      <View style={styles.voiceButtonSection}>
        {!isTypingMode ? (
          <>
            <VoiceButton onCommand={onVoiceCommand} label="Tap to speak" size="large" />
            <TouchableOpacity 
              style={styles.typeButton}
              onPress={() => setIsTypingMode(true)}
            >
              <Text style={styles.typeButtonText}>Type instead</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your question here..."
              placeholderTextColor="#9ca3af"
              value={textInput}
              onChangeText={setTextInput}
              multiline
              autoFocus
              onSubmitEditing={() => {
                if (textInput.trim()) {
                  onVoiceCommand(textInput.trim());
                  setTextInput('');
                  setIsTypingMode(false);
                }
              }}
            />
            <View style={styles.textInputActions}>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  if (textInput.trim()) {
                    onVoiceCommand(textInput.trim());
                    setTextInput('');
                    setIsTypingMode(false);
                  }
                }}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setTextInput('');
                  setIsTypingMode(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Category Buttons - 2x2 Grid */}
      <View style={styles.categorySection}>
        {/* First Row */}
        <View style={styles.categoryGrid}>
          <TouchableOpacity 
            onPress={() => onNavigate('events')}
            style={styles.categoryButton}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="event" size={32} color="#2563eb" />
            </View>
            <Text style={styles.categoryText}>Events</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onNavigate('volunteer')}
            style={styles.categoryButton}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="people" size={32} color="#2563eb" />
            </View>
            <Text style={styles.categoryText}>Volunteers</Text>
          </TouchableOpacity>
        </View>
        
        {/* Second Row */}
        <View style={styles.categoryGrid}>
          <TouchableOpacity 
            onPress={() => onNavigate('health')}
            style={styles.categoryButton}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="favorite" size={32} color="#2563eb" />
            </View>
            <Text style={styles.categoryText}>Health Services</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onNavigate('medication')}
            style={styles.categoryButton}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="medication" size={32} color="#2563eb" />
            </View>
            <Text style={styles.categoryText}>Medication Guide</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#eff6ff',
    zIndex: 1000,
    gap: 12,
  },
  emergencyButtonContainer: {
    flex: 1,
  },
  emergencyButton: {
    width: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  voiceButtonSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  categorySection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#dbeafe',
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    color: '#111827',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  typeButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  typeButtonText: {
    color: '#2563eb',
    fontSize: 20,
  },
  textInputContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInputActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
  },
});
