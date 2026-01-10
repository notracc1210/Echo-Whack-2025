import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerSchedulePageProps {
  userId: string;
  onBack: () => void;
}

interface DaySchedule {
  available: boolean;
  hours: string[];
}

interface Schedule {
  [key: string]: DaySchedule;
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function VolunteerSchedulePage({ userId, onBack }: VolunteerSchedulePageProps) {
  const [schedule, setSchedule] = useState<Schedule>({});
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/schedule?volunteerId=${userId}`);
      const data = await response.json();
      setSchedule(data.schedule || {});
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDay = async (dayKey: string) => {
    const newSchedule = {
      ...schedule,
      [dayKey]: {
        ...schedule[dayKey],
        available: !schedule[dayKey]?.available,
      },
    };
    setSchedule(newSchedule);
    await saveSchedule(newSchedule);
  };

  const saveSchedule = async (newSchedule: Schedule) => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      await fetch(`${API_BASE_URL}/api/volunteer/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerId: userId, schedule: newSchedule }),
      });
      Alert.alert('Success', 'Schedule updated successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  const formatHours = (hours: string[]) => {
    if (hours.length === 0) return 'Not available';
    if (hours.length === 2) {
      return `${hours[0]} - ${hours[1]}`;
    }
    return hours.join(', ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Set Your Availability</Text>
        <Text style={styles.sectionSubtitle}>Toggle days you're available and set your hours</Text>

        {DAYS.map(day => (
          <View key={day.key} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Switch
                value={schedule[day.key]?.available || false}
                onValueChange={() => handleToggleDay(day.key)}
                trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                thumbColor="#ffffff"
              />
            </View>
            {schedule[day.key]?.available && (
              <View style={styles.hoursContainer}>
                <Text style={styles.hoursText}>
                  Available: {formatHours(schedule[day.key].hours)}
                </Text>
                <TouchableOpacity style={styles.editHoursButton}>
                  <Text style={styles.editHoursText}>Edit Hours</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Your availability helps match you with requests that fit your schedule.
          </Text>
        </View>
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
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  dayCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  hoursContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  hoursText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  editHoursButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  editHoursText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
});



