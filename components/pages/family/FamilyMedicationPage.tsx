import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyMedicationPageProps {
  userId: string;
  onBack: () => void;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  adherence: number;
  lastTaken: string;
}

export function FamilyMedicationPage({ userId, onBack }: FamilyMedicationPageProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adultId, setAdultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      
      // Get connected adult ID
      const connectionRes = await fetch(`${API_BASE_URL}/api/family/loved-one?familyId=${userId}`);
      if (connectionRes.ok) {
        const connectionData = await connectionRes.json();
        setAdultId(connectionData.adultId);

        // Get medications
        const medsRes = await fetch(`${API_BASE_URL}/api/family/medications?adultId=${connectionData.adultId}`);
        if (medsRes.ok) {
          const medsData = await medsRes.json();
          setMedications(medsData.medications || []);
        }
      } else {
        // Not connected
        setMedications([]);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 90) return '#10b981';
    if (adherence >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medication Monitoring</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : !adultId ? (
          <View style={styles.notConnectedContainer}>
            <MaterialIcons name="link-off" size={64} color="#9ca3af" />
            <Text style={styles.notConnectedText}>
              Connect to your loved one's account to view their medications.
            </Text>
          </View>
        ) : medications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="medication" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No medications found</Text>
          </View>
        ) : (
          <>
            {medications.map(med => (
              <View key={med.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <MaterialIcons name="medication" size={32} color="#2563eb" />
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{med.name}</Text>
                    <Text style={styles.medicationDosage}>{med.dosage} • {med.frequency}</Text>
                  </View>
                </View>

                <View style={styles.adherenceContainer}>
                  <Text style={styles.adherenceLabel}>Adherence</Text>
                  <View style={styles.adherenceBar}>
                    <View
                      style={[
                        styles.adherenceFill,
                        {
                          width: `${med.adherence}%`,
                          backgroundColor: getAdherenceColor(med.adherence),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.adherencePercent, { color: getAdherenceColor(med.adherence) }]}>
                    {med.adherence}%
                  </Text>
                </View>

                <View style={styles.reminderContainer}>
                  <Text style={styles.reminderLabel}>Reminder Times:</Text>
                  <Text style={styles.reminderTimes}>
                    {med.reminderTimes.map(formatTime).join(', ')}
                  </Text>
                </View>

                <View style={styles.lastTakenContainer}>
                  <MaterialIcons name="access-time" size={16} color="#6b7280" />
                  <Text style={styles.lastTakenText}>
                    Last taken: {new Date(med.lastTaken).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
    padding: 24,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  notConnectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  notConnectedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  medicationCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  medicationDosage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  adherenceContainer: {
    marginBottom: 16,
  },
  adherenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherencePercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderContainer: {
    marginBottom: 12,
  },
  reminderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reminderTimes: {
    fontSize: 14,
    color: '#6b7280',
  },
  lastTakenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  lastTakenText: {
    fontSize: 12,
    color: '#6b7280',
  },
});



