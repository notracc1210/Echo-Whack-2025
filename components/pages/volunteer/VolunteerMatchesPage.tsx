import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerMatchesPageProps {
  userId: string;
  onBack: () => void;
}

interface Match {
  id: string;
  adultId: string;
  adultName: string;
  type: string;
  status: string;
  startDate: string;
  contactInfo: {
    phone: string;
    address: string;
  };
}

export function VolunteerMatchesPage({ userId, onBack }: VolunteerMatchesPageProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/matches?volunteerId=${userId}`);
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Current Match</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="handshake" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No active matches</Text>
            <Text style={styles.emptySubtext}>Accepted requests will appear here</Text>
          </View>
        ) : (
          matches.map(match => (
            <View key={match.id} style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <MaterialIcons name="person" size={48} color="#2563eb" />
                <View style={styles.matchHeaderText}>
                  <Text style={styles.matchName}>{match.adultName}</Text>
                  <Text style={styles.matchType}>{match.type.replace('-', ' ').toUpperCase()}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>

              <View style={styles.matchDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="phone" size={20} color="#6b7280" />
                  <Text style={styles.detailText}>{match.contactInfo.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="place" size={20} color="#6b7280" />
                  <Text style={styles.detailText}>{match.contactInfo.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="calendar-today" size={20} color="#6b7280" />
                  <Text style={styles.detailText}>
                    Started: {new Date(match.startDate).toLocaleString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Notes</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note about this match..."
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={styles.contactButton}>
                <MaterialIcons name="phone" size={20} color="#ffffff" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  matchCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  matchHeaderText: {
    flex: 1,
  },
  matchName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  matchType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  matchDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
});



