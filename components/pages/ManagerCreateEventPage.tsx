import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchWithTimeout } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ManagerCreateEventPageProps {
  onBack: () => void;
}

export function ManagerCreateEventPage({ onBack }: ManagerCreateEventPageProps) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [distance, setDistance] = useState('');
  const [publishing, setPublishing] = useState(false);
  const insets = useSafeAreaInsets();

  const handleCreateEvent = async () => {
    if (!name || !time) {
      Alert.alert('Error', 'Please fill in the Event Name and Time');
      return;
    }

    setPublishing(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          time,
          distance: distance || 'Nearby',
          icon: '📅' // Default icon
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Success', 
          'Event published to application!',
          [{ text: 'OK', onPress: onBack }]
        );
        setName('');
        setTime('');
        setDistance('');
      } else {
        Alert.alert('Error', 'Failed to publish event');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#374151" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.subtitle}>Publish New Community Event</Text>
        
        <View style={styles.form}>
          <Text style={styles.label}>Event Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., Bingo Night"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Time & Date</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., Friday at 6:00 PM"
            value={time}
            onChangeText={setTime}
          />

          <Text style={styles.label}>Location/Distance</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g., 0.5 miles"
            value={distance}
            onChangeText={setDistance}
          />

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCreateEvent}
            disabled={publishing}
          >
            {publishing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Publish Event</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: { padding: 20 },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 15 },
  form: { gap: 15, backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});



