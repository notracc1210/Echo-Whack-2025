import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryAI } from '../../utils/api';
import { playTextToSpeech, stopAudioPlayback, initializeAudio } from '../../utils/audioPlayer';
import { Page } from '../../App';

interface GeneralInfoPageProps {
  query: string;
  onBack: () => void;
  onVoiceCommand: (command: string) => void;
  onNavigate?: (page: Page) => void;
  onSuggestedRoutesChange?: (routes: string[]) => void;
}

export function GeneralInfoPage({ query, onBack, onVoiceCommand, onNavigate, onSuggestedRoutesChange }: GeneralInfoPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [suggestedRoutes, setSuggestedRoutes] = useState<string[]>([]);
  const [hasAskedForDetails, setHasAskedForDetails] = useState(false);
  const [previousQuery, setPreviousQuery] = useState<string>("");
  const [showMedicalOptions, setShowMedicalOptions] = useState(false);
  const [showEmergencyPrompt, setShowEmergencyPrompt] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const insets = useSafeAreaInsets();

  // Check if query indicates medical condition
  const checkMedicalCondition = (queryText: string): boolean => {
    const lowerQuery = queryText.toLowerCase();
    const medicalConditions = [
      "headache", "head ache", "migraine",
      "stomach ache", "stomachache", "nausea",
      "chest pain", "back pain", "joint pain",
      "dizziness", "fever", "cough",
      "sore throat", "rash", "injury"
    ];
    return medicalConditions.some(condition => lowerQuery.includes(condition));
  };

  // Check if query indicates fell down
  const checkFellDown = (queryText: string): boolean => {
    const lowerQuery = queryText.toLowerCase();
    return lowerQuery.includes("fell down") ||
      lowerQuery.includes("just fell down") ||
      lowerQuery.includes("i fell down") ||
      lowerQuery.includes("i just fell");
  };

  // Handle 911 call
  const handleCall911 = () => {
    Alert.alert(
      "Call 911?",
      "This will call emergency services. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Call 911",
          style: "destructive",
          onPress: () => {
            Linking.openURL("tel:911").catch(err => {
              Alert.alert("Error", "Unable to make phone call. Please dial 911 manually.");
            });
          }
        }
      ]
    );
  };

  // Initialize audio on component mount
  useEffect(() => {
    initializeAudio().catch(console.error);

    // Cleanup: stop audio when component unmounts
    return () => {
      stopAudioPlayback().catch(console.error);
    };
  }, []);

  useEffect(() => {
    // Fetch AI response when query changes
    if (query && query.trim().length > 0 && query !== previousQuery) {
      const isNewQuery = query !== previousQuery;
      setPreviousQuery(query);
      setHasAutoPlayed(false); // Reset auto-play flag for new query
      
      // Check for emergency scenario (fell down)
      if (checkFellDown(query)) {
        setShowEmergencyPrompt(true);
        setShowMedicalOptions(false);
        setSuggestedRoutes([]);
        const promptMessage = "I understand you just fell down. Do you need to call 911 for emergency assistance?";
        setAiResponse(promptMessage);
        setIsLoading(false);
        // Auto-play the first time for new queries
        if (isNewQuery) {
          playTextToSpeech(promptMessage).catch((error) => {
            console.error('Failed to play audio:', error);
          });
          setHasAutoPlayed(true);
        }
        return;
      }

      // Check for medical conditions
      if (checkMedicalCondition(query)) {
        setShowMedicalOptions(true);
        setShowEmergencyPrompt(false);
        setSuggestedRoutes([]);
        const promptMessage = "I understand you're experiencing a medical condition. I can help you find hospital services or match you with a volunteer who can assist. Which would you prefer?";
        setAiResponse(promptMessage);
        setIsLoading(false);
        // Auto-play the first time for new queries
        if (isNewQuery) {
          playTextToSpeech(promptMessage).catch((error) => {
            console.error('Failed to play audio:', error);
          });
          setHasAutoPlayed(true);
        }
        return;
      }

      // Reset flags for non-medical queries
      setShowMedicalOptions(false);
      setShowEmergencyPrompt(false);
      setSuggestedRoutes([]);
      
      // Check if query indicates feeling uncomfortable
      const lowerQuery = query.toLowerCase();
      const isFeelingUncomfortable = lowerQuery.includes("feeling uncomfortable") ||
        lowerQuery.includes("i am feeling uncomfortable") ||
        lowerQuery.includes("i'm feeling uncomfortable");
      
      // If user mentions feeling uncomfortable and we haven't asked for details yet, ask for more details
      if (isFeelingUncomfortable && !hasAskedForDetails) {
        setHasAskedForDetails(true);
        setSuggestedRoutes([]);
        const promptMessage = "I understand you're feeling uncomfortable. Can you tell me more about what's making you feel this way? For example, are you experiencing physical discomfort, emotional distress, or something else?";
        setAiResponse(promptMessage);
        setIsLoading(false);
        // Auto-play the first time for new queries
        if (isNewQuery) {
          playTextToSpeech(promptMessage).catch((error) => {
            console.error('Failed to play audio:', error);
          });
          setHasAutoPlayed(true);
        }
        return;
      }

      // Reset the flag if it's a new query that's not about feeling uncomfortable
      if (!isFeelingUncomfortable) {
        setHasAskedForDetails(false);
      }

      // Process the query normally (either initial query or follow-up)
      setIsLoading(true);
      // Stop any currently playing audio
      stopAudioPlayback().catch(console.error);
      
      queryAI(query)
        .then((result) => {
          setAiResponse(result.response);
          const routes = result.suggestedRoutes || [];
          setSuggestedRoutes(routes);
          // Update conversation memory in parent component
          if (onSuggestedRoutesChange) {
            onSuggestedRoutesChange(routes);
          }
          setIsLoading(false);
          
          // Auto-play audio the first time when AI response is received for new queries
          if (result.response && result.response.trim().length > 0 && isNewQuery) {
            playTextToSpeech(result.response).catch((error) => {
              console.error('Failed to play audio:', error);
            });
            setHasAutoPlayed(true);
          }
        })
        .catch((error: any) => {
          console.error('Failed to get AI response:', error);
          
          // Check if it's a quota error
          if (error?.quotaExceeded || error?.message?.includes('quota') || error?.message?.includes('429')) {
            const serviceName = error?.service || 'AI Service';
            const errorType = error?.errorType === 'rate_limit' ? 'rate limit' : 'quota exceeded';
            const errorMsg = error?.message || error?.error || 'quota exceeded';
            const fallbackResponse = `${serviceName} encountered ${errorType}. Please try again later.\n\nI heard you say: "${query}".`;
            setAiResponse(fallbackResponse);
            setIsLoading(false);
            return; // Don't play audio if quota exceeded
          }
          
          const fallbackResponse = `I heard you say: "${query}". How can I help you find what you're looking for?`;
          setAiResponse(fallbackResponse);
          setIsLoading(false);
          
          // Auto-play fallback response the first time for new queries
          // Note: isNewQuery is captured at the start of the effect
          if (isNewQuery) {
            playTextToSpeech(fallbackResponse).catch((error) => {
              console.error('Failed to play audio:', error);
            });
            setHasAutoPlayed(true);
          }
        });
    }

    // Cleanup: stop audio when query changes
    return () => {
      stopAudioPlayback().catch(console.error);
    };
  }, [query, previousQuery, hasAskedForDetails, hasAutoPlayed]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Here's what I found</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>You asked</Text>
              <Text style={styles.infoValue}>"{query}"</Text>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.responseHeader}>
                <Text style={styles.infoLabel}>AI Response</Text>
                {aiResponse && !isLoading && (
                  <TouchableOpacity
                    style={styles.replayButton}
                    onPress={() => {
                      stopAudioPlayback().catch(console.error);
                      playTextToSpeech(aiResponse).catch((error) => {
                        console.error('Failed to replay audio:', error);
                      });
                    }}
                  >
                    <MaterialIcons name="replay" size={20} color="#2563eb" />
                    <Text style={styles.replayButtonText}>Replay</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isLoading ? (
                <Text style={styles.infoValue}>Thinking...</Text>
              ) : aiResponse ? (
                <>
                  <Text style={styles.infoValue}>{aiResponse}</Text>
                  
                  {/* Routing Suggestions - Embedded in Response */}
                  {suggestedRoutes.length > 0 && onNavigate && (
                    <View style={styles.embeddedButtonsContainer}>
                      <Text style={styles.suggestionsLabel}>Explore:</Text>
                      <View style={styles.embeddedButtonsRow}>
                        {suggestedRoutes.includes('events') && (
                          <TouchableOpacity
                            style={[styles.embeddedButton, styles.embeddedEventsButton]}
                            onPress={() => onNavigate('events')}
                          >
                            <MaterialIcons name="event" size={24} color="#ffffff" />
                            <Text style={styles.embeddedButtonText}>Events</Text>
                          </TouchableOpacity>
                        )}
                        {suggestedRoutes.includes('volunteer') && (
                          <TouchableOpacity
                            style={[styles.embeddedButton, styles.embeddedVolunteerButton]}
                            onPress={() => onNavigate('volunteer')}
                          >
                            <MaterialIcons name="people" size={24} color="#ffffff" />
                            <Text style={styles.embeddedButtonText}>Volunteers</Text>
                          </TouchableOpacity>
                        )}
                        {suggestedRoutes.includes('health') && (
                          <TouchableOpacity
                            style={[styles.embeddedButton, styles.embeddedHealthButton]}
                            onPress={() => onNavigate('health')}
                          >
                            <MaterialIcons name="local-hospital" size={24} color="#ffffff" />
                            <Text style={styles.embeddedButtonText}>Health</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.infoValue}>Processing your request...</Text>
              )}
            </View>
          </View>
        </View>

        {/* Medical Condition Options */}
        {showMedicalOptions && onNavigate && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.hospitalButton]}
              onPress={() => onNavigate('health')}
            >
              <MaterialIcons name="local-hospital" size={32} color="#ffffff" />
              <Text style={styles.actionButtonText}>Hospital Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.volunteerButton]}
              onPress={() => onNavigate('volunteer')}
            >
              <MaterialIcons name="people" size={32} color="#ffffff" />
              <Text style={styles.actionButtonText}>Match Volunteer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Prompt */}
        {showEmergencyPrompt && (
          <View style={styles.emergencyContainer}>
            <View style={styles.emergencyCard}>
              <MaterialIcons name="emergency" size={48} color="#ef4444" />
              <Text style={styles.emergencyTitle}>Emergency Assistance</Text>
              <Text style={styles.emergencyText}>
                Do you need to call 911 for emergency medical assistance?
              </Text>
              <View style={styles.emergencyButtons}>
                <TouchableOpacity
                  style={[styles.emergencyButton, styles.call911Button]}
                  onPress={handleCall911}
                >
                  <MaterialIcons name="phone" size={24} color="#ffffff" />
                  <Text style={styles.emergencyButtonText}>Call 911</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.emergencyButton, styles.cancelButton]}
                  onPress={() => {
                    setShowEmergencyPrompt(false);
                    if (onNavigate) {
                      onNavigate('health');
                    }
                  }}
                >
                  <Text style={styles.emergencyButtonTextCancel}>No, find health services</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <View style={styles.footerContent}>
          <VoiceButton onCommand={onVoiceCommand} label="Ask another question" size="medium" />
          <TouchableOpacity style={styles.typeButton}>
            <Text style={styles.typeButtonText}>Type instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backText: {
    color: '#2563eb',
    fontSize: 24,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoSection: {
    gap: 24,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  replayButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    gap: 8,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  playingText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  embeddedButtonsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  suggestionsLabel: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  embeddedButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  embeddedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 100,
  },
  embeddedEventsButton: {
    backgroundColor: '#10b981',
  },
  embeddedVolunteerButton: {
    backgroundColor: '#2563eb',
  },
  embeddedHealthButton: {
    backgroundColor: '#ef4444',
  },
  embeddedButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 20,
  },
  infoValue: {
    color: '#111827',
    fontSize: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  footerContent: {
    alignItems: 'center',
    gap: 16,
  },
  typeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  typeButtonText: {
    color: '#2563eb',
    fontSize: 20,
  },
  actionButtonsContainer: {
    marginTop: 24,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hospitalButton: {
    backgroundColor: '#ef4444',
  },
  volunteerButton: {
    backgroundColor: '#2563eb',
  },
  eventsButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
  },
  emergencyContainer: {
    marginTop: 24,
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  emergencyText: {
    color: '#4b5563',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  emergencyButtons: {
    width: '100%',
    gap: 12,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  call911Button: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  emergencyButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
  },
  emergencyButtonTextCancel: {
    color: '#4b5563',
    fontSize: 20,
    fontWeight: '600',
  },
});
