import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyVolunteerPageProps {
  userId: string;
  onBack: () => void;
}

export function FamilyVolunteerPage({ userId, onBack }: FamilyVolunteerPageProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
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

        const volunteerRes = await fetch(`${API_BASE_URL}/api/family/volunteers?adultId=${connectionData.adultId}`);
        if (volunteerRes.ok) {
          const volunteerData = await volunteerRes.json();
          setRequests(volunteerData.requests || []);
          setMatches(volunteerData.matches || []);
        }
      }
    } catch (error) {
      console.error('Error loading volunteer info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'tech': 'computer',
      'grocery': 'shopping-cart',
      'home-repair': 'build',
      'mobility': 'accessible',
      'companionship': 'people',
      'medical-transport': 'local-hospital',
    };
    return icons[type] || 'help';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': '#f59e0b',
      'accepted': '#10b981',
      'active': '#10b981',
      'declined': '#ef4444',
      'completed': '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer Requests</Text>
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
              Connect to your loved one's account to view volunteer requests.
            </Text>
          </View>
        ) : (
          <>
            {matches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Matches</Text>
                {matches.map(match => (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <MaterialIcons name={getTypeIcon(match.type) as any} size={32} color="#2563eb" />
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchType}>{match.type.replace('-', ' ').toUpperCase()}</Text>
                        <Text style={styles.matchStatus}>Status: Active</Text>
                      </View>
                    </View>
                    <Text style={styles.matchDescription}>
                      Matched with volunteer on {new Date(match.startDate).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {requests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Requests</Text>
                {requests.map(request => (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <MaterialIcons name={getTypeIcon(request.type) as any} size={32} color="#2563eb" />
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestType}>{request.type.replace('-', ' ').toUpperCase()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                            {request.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.requestDescription}>{request.description}</Text>
                    <Text style={styles.requestDate}>
                      Created: {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {requests.length === 0 && matches.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="people" size={64} color="#9ca3af" />
                <Text style={styles.emptyText}>No volunteer requests or matches</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  matchCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  matchStatus: {
    fontSize: 14,
    color: '#10b981',
  },
  matchDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  requestCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 12,
    color: '#6b7280',
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
});



