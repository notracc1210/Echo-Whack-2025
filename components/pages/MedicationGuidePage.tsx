import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VoiceButton } from '../VoiceButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Medication, getMedications, saveMedication, deleteMedication } from '../../utils/medicationStorage';
import { scheduleAllMedicationReminders, requestNotificationPermissions, cancelMedicationNotificationsById } from '../../utils/medicationNotifications';
import { getMedicationSuggestions, parseMedicationReminder } from '../../utils/api';

interface MedicationGuidePageProps {
  onBack: () => void;
  onVoiceCommand: (command: string) => void;
}

type TabType = 'reminders' | 'suggestions';

export function MedicationGuidePage({ onBack, onVoiceCommand }: MedicationGuidePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('reminders');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: 'Daily',
    reminderTimes: [] as string[],
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [symptomInput, setSymptomInput] = useState('');
  const [suggestions, setSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const insets = useSafeAreaInsets();

  // Load medications on mount
  useEffect(() => {
    loadMedications();
    requestNotificationPermissions();
  }, []);

  const loadMedications = async () => {
    setIsLoading(true);
    try {
      const data = await getMedications();
      setMedications(data);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim() || newMedication.reminderTimes.length === 0) {
      Alert.alert('Missing Information', 'Please fill in medication name, dosage, and at least one reminder time.');
      return;
    }

    try {
      const medication = await saveMedication(newMedication);
      // Schedule notifications
      await scheduleAllMedicationReminders(medication);
      
      setMedications([...medications, medication]);
      setShowAddModal(false);
      setNewMedication({
        name: '',
        dosage: '',
        frequency: 'Daily',
        reminderTimes: [],
      });
      setShowTimePicker(false);
      Alert.alert('Success', 'Medication added and reminders scheduled!');
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    }
  };

  const handleDeleteMedication = async (id: string) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication? Reminders will be cancelled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel all notifications for this medication
              await cancelMedicationNotificationsById(id);
              await deleteMedication(id);
              setMedications(medications.filter(m => m.id !== id));
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Error', 'Failed to delete medication.');
            }
          },
        },
      ]
    );
  };

  const handleTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && date) {
        addTimeFromDate(date);
      }
    } else {
      // iOS: update selected time as user scrolls
      if (date) {
        setSelectedTime(date);
      }
    }
  };

  const addTimeFromDate = (date: Date) => {
    if (newMedication.reminderTimes.length >= 3) {
      Alert.alert('Maximum Limit', 'You can only add up to 3 reminder times.');
      return;
    }

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    if (!newMedication.reminderTimes.includes(timeString)) {
      setNewMedication({
        ...newMedication,
        reminderTimes: [...newMedication.reminderTimes, timeString].sort(),
      });
    } else {
      Alert.alert('Duplicate Time', 'This reminder time is already added.');
    }
  };

  const openTimePicker = () => {
    if (newMedication.reminderTimes.length >= 3) {
      Alert.alert('Maximum Limit', 'You can only add up to 3 reminder times.');
      return;
    }
    setShowTimePicker(true);
  };

  const removeReminderTime = (time: string) => {
    setNewMedication({
      ...newMedication,
      reminderTimes: newMedication.reminderTimes.filter(t => t !== time),
    });
  };

  const handleGetSuggestions = async (symptoms?: string) => {
    const symptomsText = symptoms || symptomInput;
    
    if (!symptomsText.trim()) {
      Alert.alert('Missing Information', 'Please describe your symptoms.');
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestions(null);
    
    // Update symptom input if provided
    if (symptoms) {
      setSymptomInput(symptoms);
    }
    
    try {
      const result = await getMedicationSuggestions(symptomsText);
      setSuggestions(result);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      Alert.alert('Error', 'Failed to get medication suggestions. Please try again.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    if (activeTab === 'suggestions') {
      // On suggestions tab, use voice input as symptoms and get medication suggestions
      handleGetSuggestions(command);
    } else {
      // On reminders tab, try to parse medication reminder from voice command
      try {
        setIsLoading(true);
        const parsed = await parseMedicationReminder(command);
        
        // Check if this looks like a medication reminder request (even if AI said success=false)
        const medicationKeywords = ['remind', 'reminder', 'medicine', 'medication', 'pill', 'tablet', 'take', 'add', 'set'];
        const lowerCommand = command.toLowerCase();
        const looksLikeMedication = medicationKeywords.some(keyword => lowerCommand.includes(keyword));
        
        // If we have a name and times, or if it looks like a medication request, proceed
        const hasName = parsed.name && parsed.name.trim() !== '' && parsed.name !== 'null';
        const hasTimes = parsed.reminderTimes && parsed.reminderTimes.length > 0;
        
        if ((parsed.success || looksLikeMedication) && hasName && hasTimes) {
          // Automatically create the medication reminder
          const medicationData = {
            name: parsed.name,
            dosage: parsed.dosage || 'As prescribed',
            frequency: parsed.frequency || 'Daily',
            reminderTimes: parsed.reminderTimes,
          };
          
          try {
            const medication = await saveMedication(medicationData);
            // Schedule notifications
            await scheduleAllMedicationReminders(medication);
            
            // Reload medications list
            await loadMedications();
            
            // Show success message
            Alert.alert(
              'Medication Reminder Added',
              `Successfully added ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ''} with reminders at ${medication.reminderTimes.map(t => formatTime(t)).join(', ')}.`,
              [{ text: 'OK' }]
            );
          } catch (saveError) {
            console.error('Error saving medication:', saveError);
            Alert.alert(
              'Error',
              'Failed to save medication reminder. Please try again or use the form.',
              [{ text: 'OK' }]
            );
          }
        } else if ((parsed.success || looksLikeMedication) && hasName) {
          // If we have a name but no times, pre-fill the form for user to complete
          setNewMedication({
            name: parsed.name || 'Medication',
            dosage: parsed.dosage || 'As prescribed',
            frequency: parsed.frequency || 'Daily',
            reminderTimes: parsed.reminderTimes || ['08:00'], // Default to one time
          });
          
          // Open the modal to show the parsed information
          setShowAddModal(true);
          
          // Show message asking for times
          Alert.alert(
            'Medication Reminder',
            `I found: ${parsed.name}${parsed.dosage ? ` (${parsed.dosage})` : ''}. Please review and add reminder times if needed, then save.`,
            [{ text: 'OK' }]
          );
        } else if (looksLikeMedication) {
          // Even if parsing failed, if it looks like medication, open the form
          setNewMedication({
            name: parsed.name || 'Medication',
            dosage: parsed.dosage || 'As prescribed',
            frequency: parsed.frequency || 'Daily',
            reminderTimes: parsed.reminderTimes || ['08:00'],
          });
          
          setShowAddModal(true);
          Alert.alert(
            'Add Medication Reminder',
            'I detected you want to add a medication reminder. Please fill in the details and save.',
            [{ text: 'OK' }]
          );
        } else {
          // If parsing failed and doesn't look like medication, use default handler
          Alert.alert(
            'Could not parse medication reminder',
            parsed.message || 'Please try speaking more clearly, or use the form to add a medication reminder.',
            [{ text: 'OK' }]
          );
          // Still call the default handler for other commands
          onVoiceCommand(command);
        }
      } catch (error: any) {
        console.error('Error parsing medication reminder:', error);
        let errorMessage = 'Failed to parse medication reminder. Please try again or use the form.';
        
        // Provide more specific error messages
        if (error.message) {
          if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = 'Server endpoint not found. Please make sure the server is running (cd server && npm start).';
          } else if (error.message.includes('HTML') || error.message.includes('JSON Parse')) {
            errorMessage = 'Server returned an error. Please check if the server is running and try again.';
          } else {
            errorMessage = error.message;
          }
        }
        
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
        // Fall back to default handler
        onVoiceCommand(command);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const frequencyOptions = ['Daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed'];

  // Convert HH:MM format to 12-hour format with AM/PM
  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medication Guide</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reminders' && styles.tabActive]}
          onPress={() => setActiveTab('reminders')}
        >
          <MaterialIcons 
            name="notifications" 
            size={24} 
            color={activeTab === 'reminders' ? '#ffffff' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.tabTextActive]}>
            Reminders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.tabActive]}
          onPress={() => setActiveTab('suggestions')}
        >
          <MaterialIcons 
            name="medical-services" 
            size={24} 
            color={activeTab === 'suggestions' ? '#ffffff' : '#6b7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'suggestions' && styles.tabTextActive]}>
            Suggestions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'reminders' ? (
          <>
            {/* Add Medication Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialIcons name="add" size={32} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Medication</Text>
            </TouchableOpacity>

            {/* Medications List */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
            ) : medications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="medication" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No medications added yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "Add Medication" to get started with reminders
                </Text>
              </View>
            ) : (
              medications.map((medication) => (
                <View key={medication.id} style={styles.medicationCard}>
                  <View style={styles.medicationHeader}>
                    <View style={styles.medicationIcon}>
                      <MaterialIcons name="medication" size={32} color="#2563eb" />
                    </View>
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{medication.name}</Text>
                      <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                      <Text style={styles.medicationFrequency}>{medication.frequency}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteMedication(medication.id)}
                      style={styles.deleteButton}
                    >
                      <MaterialIcons name="delete" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.reminderTimes}>
                    <Text style={styles.reminderTimesLabel}>Reminder Times:</Text>
                    <View style={styles.reminderTimesList}>
                      {medication.reminderTimes.map((time) => (
                        <View key={time} style={styles.reminderTimeBadge}>
                          <Text style={styles.reminderTimeText}>{formatTime(time)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Symptom Input */}
            <View style={styles.symptomSection}>
              <Text style={styles.sectionTitle}>Describe your symptoms</Text>
              <TextInput
                style={styles.symptomInput}
                placeholder="e.g., headache, mild fever, cough..."
                placeholderTextColor="#9ca3af"
                value={symptomInput}
                onChangeText={setSymptomInput}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleGetSuggestions}
                disabled={isLoadingSuggestions}
              >
                {isLoadingSuggestions ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="search" size={24} color="#ffffff" />
                    <Text style={styles.searchButtonText}>Get Suggestions</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Suggestions Results */}
            {suggestions && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.sectionTitle}>Medication Suggestions</Text>
                <View style={styles.disclaimerBox}>
                  <MaterialIcons name="warning" size={24} color="#ef4444" />
                  <Text style={styles.disclaimerText}>
                    {suggestions.disclaimer || 'This is not medical advice. Always consult a healthcare professional.'}
                  </Text>
                </View>
                {suggestions.suggestions && suggestions.suggestions.length > 0 ? (
                  suggestions.suggestions.map((suggestion: any, index: number) => (
                    <View key={index} style={styles.suggestionCard}>
                      <Text style={styles.suggestionMedication}>{suggestion.medication}</Text>
                      <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                      {suggestion.safetyNotes && (
                        <View style={styles.safetyNotes}>
                          <MaterialIcons name="info" size={20} color="#ef4444" />
                          <Text style={styles.safetyNotesText}>{suggestion.safetyNotes}</Text>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noSuggestionsText}>
                    No suggestions available. Please consult a healthcare professional.
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Medication Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Medication</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={32} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Medication Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Aspirin"
                value={newMedication.name}
                onChangeText={(text) => setNewMedication({ ...newMedication, name: text })}
              />

              <Text style={styles.inputLabel}>Dosage *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 100mg, 1 tablet"
                value={newMedication.dosage}
                onChangeText={(text) => setNewMedication({ ...newMedication, dosage: text })}
              />

              <Text style={styles.inputLabel}>Frequency *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frequencyOptions}>
                {frequencyOptions.map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      newMedication.frequency === freq && styles.frequencyOptionActive,
                    ]}
                    onPress={() => setNewMedication({ ...newMedication, frequency: freq })}
                  >
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        newMedication.frequency === freq && styles.frequencyOptionTextActive,
                      ]}
                    >
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Reminder Times * (up to 3)</Text>
              <TouchableOpacity 
                style={[
                  styles.input, 
                  styles.timeInputButton,
                  newMedication.reminderTimes.length >= 3 && styles.timeInputButtonDisabled
                ]} 
                onPress={openTimePicker}
                disabled={newMedication.reminderTimes.length >= 3}
              >
                <MaterialIcons 
                  name="access-time" 
                  size={24} 
                  color={newMedication.reminderTimes.length >= 3 ? '#9ca3af' : '#2563eb'} 
                />
                <Text style={[
                  styles.timeInputButtonText,
                  newMedication.reminderTimes.length >= 3 && styles.timeInputButtonTextDisabled
                ]}>
                  Select Time
                </Text>
              </TouchableOpacity>
              
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
              
              {Platform.OS === 'ios' && showTimePicker && (
                <View style={styles.timePickerActions}>
                  <TouchableOpacity 
                    style={styles.timePickerCancelButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.timePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.timePickerConfirmButton}
                    onPress={() => {
                      addTimeFromDate(selectedTime);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={styles.timePickerConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}

              {newMedication.reminderTimes.length > 0 && (
                <View style={[styles.reminderTimesList, styles.reminderTimesListModal]}>
                  {newMedication.reminderTimes.map((time) => (
                    <View key={time} style={styles.reminderTimeBadge}>
                      <Text style={styles.reminderTimeText}>{formatTime(time)}</Text>
                      <TouchableOpacity onPress={() => removeReminderTime(time)}>
                        <MaterialIcons name="close" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelModalButton} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddMedication}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <VoiceButton 
          onCommand={handleVoiceCommand} 
          label={activeTab === 'suggestions' ? 'Describe your symptoms' : 'Add medication reminder'} 
          size="medium" 
        />
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 24,
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#9ca3af',
    fontSize: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  medicationCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medicationIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationDosage: {
    color: '#4b5563',
    fontSize: 20,
    marginBottom: 4,
  },
  medicationFrequency: {
    color: '#6b7280',
    fontSize: 18,
  },
  deleteButton: {
    padding: 8,
  },
  reminderTimes: {
    marginTop: 8,
  },
  reminderTimesLabel: {
    color: '#4b5563',
    fontSize: 18,
    marginBottom: 8,
  },
  reminderTimesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTimesListModal: {
    marginTop: 20,
  },
  reminderTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reminderTimeText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  symptomSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  symptomInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: 16,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disclaimerText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 18,
    lineHeight: 24,
  },
  suggestionCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  suggestionMedication: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionDescription: {
    color: '#4b5563',
    fontSize: 20,
    marginBottom: 12,
  },
  safetyNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  safetyNotesText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 18,
  },
  noSuggestionsText: {
    color: '#6b7280',
    fontSize: 20,
    textAlign: 'center',
    paddingVertical: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '600',
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  frequencyOptions: {
    marginVertical: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  frequencyOptionActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  frequencyOptionText: {
    color: '#4b5563',
    fontSize: 18,
  },
  frequencyOptionTextActive: {
    color: '#ffffff',
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  timeInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
  },
  timeInputButtonText: {
    color: '#2563eb',
    fontSize: 20,
    fontWeight: '600',
  },
  timeInputButtonDisabled: {
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  timeInputButtonTextDisabled: {
    color: '#9ca3af',
  },
  addTimeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  timePickerCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  timePickerCancelText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  timePickerConfirmText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#6b7280',
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
});

