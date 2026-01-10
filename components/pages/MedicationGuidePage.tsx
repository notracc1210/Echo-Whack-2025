import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Medication, getMedications, saveMedication, deleteMedication } from '../../utils/medicationStorage';
import { scheduleAllMedicationReminders, requestNotificationPermissions } from '../../utils/medicationNotifications';
import { getMedicationSuggestions } from '../../utils/api';

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
  const [currentTime, setCurrentTime] = useState('');
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
      setCurrentTime('');
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

  const addReminderTime = () => {
    if (currentTime.trim() && /^\d{2}:\d{2}$/.test(currentTime)) {
      if (!newMedication.reminderTimes.includes(currentTime)) {
        setNewMedication({
          ...newMedication,
          reminderTimes: [...newMedication.reminderTimes, currentTime].sort(),
        });
        setCurrentTime('');
      } else {
        Alert.alert('Duplicate Time', 'This reminder time is already added.');
      }
    } else {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 09:00, 14:30)');
    }
  };

  const removeReminderTime = (time: string) => {
    setNewMedication({
      ...newMedication,
      reminderTimes: newMedication.reminderTimes.filter(t => t !== time),
    });
  };

  const handleGetSuggestions = async () => {
    if (!symptomInput.trim()) {
      Alert.alert('Missing Information', 'Please describe your symptoms.');
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestions(null);
    
    try {
      const result = await getMedicationSuggestions(symptomInput);
      setSuggestions(result);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      Alert.alert('Error', 'Failed to get medication suggestions. Please try again.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const frequencyOptions = ['Daily', 'Twice daily', 'Three times daily', 'Four times daily', 'As needed'];

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
                          <Text style={styles.reminderTimeText}>{time}</Text>
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

              <Text style={styles.inputLabel}>Reminder Times * (HH:MM format)</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="09:00"
                  value={currentTime}
                  onChangeText={setCurrentTime}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.addTimeButton} onPress={addReminderTime}>
                  <MaterialIcons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {newMedication.reminderTimes.length > 0 && (
                <View style={styles.reminderTimesList}>
                  {newMedication.reminderTimes.map((time) => (
                    <View key={time} style={styles.reminderTimeBadge}>
                      <Text style={styles.reminderTimeText}>{time}</Text>
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
        <VoiceButton onCommand={onVoiceCommand} label="Ask something else" size="medium" />
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
  addTimeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

