import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchWithTimeout } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Event {
  id: number;
  name: string;
  time: string;
  distance: string;
  icon: string;
  description: string;
}

interface ManagerEventsPageProps {
  onLogout?: () => void;
  onCreateEvent: () => void;
}

export function ManagerEventsPage({ onLogout, onCreateEvent }: ManagerEventsPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/events`);
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      } else {
        Alert.alert('Error', 'Failed to fetch events');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDeleteEvent = async (eventId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
              const response = await fetchWithTimeout(`${API_BASE_URL}/api/events/${eventId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                fetchEvents(); // Refresh list
              } else {
                Alert.alert('Error', 'Failed to delete event');
              }
            } catch (error) {
              Alert.alert('Error', 'Could not connect to server');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.title}>Community Events</Text>
         <TouchableOpacity onPress={onCreateEvent} style={styles.createButton}>
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Event</Text>
         </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.list}>
            {events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.eventTime}>{event.time}</Text>
                  <Text style={styles.eventDistance}>{event.distance}</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => handleDeleteEvent(event.id)}
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {events.length === 0 && (
              <Text style={styles.emptyText}>No active events</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: { color: '#fff', fontWeight: '600' },
  content: { padding: 20 },
  list: { gap: 12 },
  eventCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  eventTime: { fontSize: 16, color: '#4b5563', marginBottom: 2 },
  eventDistance: { fontSize: 14, color: '#6b7280' },
  deleteButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 20, fontSize: 16 }
});
