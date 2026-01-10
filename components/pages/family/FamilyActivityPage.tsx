import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyActivityPageProps {
  userId: string;
  onBack: () => void;
}

interface Activity {
  recentEvents: Array<{ id: string; name: string; date: string }>;
  healthServicesVisited: Array<{ id: string; name: string; date: string }>;
  volunteerRequests: Array<any>;
  lastActive: string;
}

export function FamilyActivityPage({ userId, onBack }: FamilyActivityPageProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
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
      
      const connectionRes = await fetch(`${API_BASE_URL}/api/family/loved-one?familyId=${userId}`);
      if (connectionRes.ok) {
        const connectionData = await connectionRes.json();
        setAdultId(connectionData.adultId);

        const activityRes = await fetch(`${API_BASE_URL}/api/family/activity?adultId=${connectionData.adultId}`);
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivity(activityData);
        }
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Summary</Text>
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
              Connect to your loved one's account to view their activity.
            </Text>
          </View>
        ) : !activity ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activity data available</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Last Active</Text>
              <Text style={styles.summaryValue}>
                {new Date(activity.lastActive).toLocaleString()}
              </Text>
            </View>

            {activity.recentEvents && activity.recentEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Events</Text>
                {activity.recentEvents.map(event => (
                  <View key={event.id} style={styles.activityItem}>
                    <MaterialIcons name="event" size={24} color="#2563eb" />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{event.name}</Text>
                      <Text style={styles.activityDate}>
                        {new Date(event.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activity.healthServicesVisited && activity.healthServicesVisited.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Health Services Visited</Text>
                {activity.healthServicesVisited.map(service => (
                  <View key={service.id} style={styles.activityItem}>
                    <MaterialIcons name="local-hospital" size={24} color="#ef4444" />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{service.name}</Text>
                      <Text style={styles.activityDate}>
                        {new Date(service.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activity.volunteerRequests && activity.volunteerRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Volunteer Requests</Text>
                {activity.volunteerRequests.map((request: any) => (
                  <View key={request.id} style={styles.activityItem}>
                    <MaterialIcons name="people" size={24} color="#10b981" />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{request.type.replace('-', ' ')}</Text>
                      <Text style={styles.activityDate}>
                        Status: {request.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
    gap: 24,
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
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 14,
    color: '#6b7280',
  },
});



