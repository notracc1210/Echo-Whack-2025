import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyHomePageProps {
  userId: string;
  userName: string;
  onNavigate: (page: 'home' | 'connection' | 'medication' | 'activity' | 'emergency' | 'volunteer') => void;
  onLogout: () => void;
}

export function FamilyHomePage({ userId, userName, onNavigate, onLogout }: FamilyHomePageProps) {
  const [connectedTo, setConnectedTo] = useState<string | null>(null);
  const [lovedOneName, setLovedOneName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/family/loved-one?familyId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setConnectedTo(data.adultId);
        setLovedOneName(data.adultName);
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 16) }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.subtitle}>Family Dashboard</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : !connectedTo ? (
          <View style={styles.notConnectedContainer}>
            <MaterialIcons name="link-off" size={64} color="#9ca3af" />
            <Text style={styles.notConnectedTitle}>Not Connected</Text>
            <Text style={styles.notConnectedText}>
              Connect to your loved one's account to monitor their health and activity.
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => onNavigate('connection')}
            >
              <Text style={styles.connectButtonText}>Connect Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.connectedCard}>
              <MaterialIcons name="check-circle" size={32} color="#10b981" />
              <View style={styles.connectedInfo}>
                <Text style={styles.connectedTitle}>Connected to</Text>
                <Text style={styles.connectedName}>{lovedOneName}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => onNavigate('medication')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                    <MaterialIcons name="medication" size={32} color="#ef4444" />
                  </View>
                  <Text style={styles.actionLabel}>Medications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => onNavigate('activity')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                    <MaterialIcons name="local-activity" size={32} color="#2563eb" />
                  </View>
                  <Text style={styles.actionLabel}>Activity</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => onNavigate('emergency')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                    <MaterialIcons name="warning" size={32} color="#dc2626" />
                  </View>
                  <Text style={styles.actionLabel}>Emergency Alerts</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => onNavigate('volunteer')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <MaterialIcons name="people" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.actionLabel}>Volunteers</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
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
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  notConnectedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  connectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  connectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 12,
  },
  connectedInfo: {
    flex: 1,
  },
  connectedTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  connectedName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});



