import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerHistoryPageProps {
  userId: string;
  onBack: () => void;
}

interface HistoryItem {
  id: string;
  adultId: string;
  adultName: string;
  type: string;
  status: string;
  completedDate: string;
  rating?: number;
  feedback?: string;
}

export function VolunteerHistoryPage({ userId, onBack }: VolunteerHistoryPageProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/history?volunteerId=${userId}`);
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <MaterialIcons
        key={i}
        name={i < rating ? 'star' : 'star-border'}
        size={20}
        color="#fbbf24"
      />
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer History</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No history yet</Text>
            <Text style={styles.emptySubtext}>Completed requests will appear here</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Total Completed</Text>
              <Text style={styles.statsNumber}>{history.length}</Text>
            </View>

            {history.map(item => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <MaterialIcons name={getTypeIcon(item.type) as any} size={32} color="#2563eb" />
                  <View style={styles.historyHeaderText}>
                    <Text style={styles.historyName}>{item.adultName}</Text>
                    <Text style={styles.historyType}>{item.type.replace('-', ' ').toUpperCase()}</Text>
                  </View>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>

                <View style={styles.historyDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="calendar-today" size={18} color="#6b7280" />
                    <Text style={styles.detailText}>
                      {new Date(item.completedDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {item.rating && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingLabel}>Rating:</Text>
                    <View style={styles.starsContainer}>
                      {renderStars(item.rating)}
                    </View>
                  </View>
                )}

                {item.feedback && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackLabel}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{item.feedback}</Text>
                  </View>
                )}
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
  statsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  statsTitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  historyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  historyHeaderText: {
    flex: 1,
  },
  historyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  historyType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },
  completedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyDetails: {
    marginBottom: 12,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  feedbackContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});



