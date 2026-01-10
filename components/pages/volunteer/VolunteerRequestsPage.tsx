import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerRequestsPageProps {
  userId: string;
  onBack: () => void;
}

interface Request {
  id: string;
  adultId: string;
  adultName: string;
  type: string;
  description: string;
  status: string;
  urgency: string;
  createdAt: string;
}

export function VolunteerRequestsPage({ userId, onBack }: VolunteerRequestsPageProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/requests?volunteerId=${userId}`);
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    Alert.alert(
      'Accept Request',
      'Are you sure you want to accept this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
              const response = await fetch(`${API_BASE_URL}/api/volunteer/requests/${requestId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volunteerId: userId }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Request accepted! You can view it in your matches.');
                loadRequests();
              } else {
                throw new Error('Failed to accept');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to accept request');
            }
          },
        },
      ]
    );
  };

  const handleDecline = async (requestId: string) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
              const response = await fetch(`${API_BASE_URL}/api/volunteer/requests/${requestId}/decline`, {
                method: 'POST',
              });

              if (response.ok) {
                loadRequests();
              } else {
                throw new Error('Failed to decline');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to decline request');
            }
          },
        },
      ]
    );
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

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#10b981',
    };
    return colors[urgency] || '#6b7280';
  };

  const filteredRequests = filter ? requests.filter(r => r.type === filter) : requests;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer Requests</Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, !filter && styles.filterChipActive]}
            onPress={() => setFilter(null)}
          >
            <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {['tech', 'grocery', 'home-repair', 'mobility', 'companionship', 'medical-transport'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filter === type && styles.filterChipActive]}
              onPress={() => setFilter(type)}
            >
              <Text style={[styles.filterText, filter === type && styles.filterTextActive]}>
                {type.replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        ) : (
          filteredRequests.map(request => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
                  <Text style={styles.urgencyText}>{request.urgency}</Text>
                </View>
                <MaterialIcons name={getTypeIcon(request.type) as any} size={32} color="#2563eb" />
              </View>

              <Text style={styles.requestType}>{request.type.replace('-', ' ').toUpperCase()}</Text>
              <Text style={styles.requestDescription}>{request.description}</Text>
              <Text style={styles.requestFrom}>From: {request.adultName}</Text>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleDecline(request.id)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAccept(request.id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  filterContainer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
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
  requestCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  requestType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  requestFrom: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});



