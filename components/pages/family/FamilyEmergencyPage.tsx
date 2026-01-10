import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyEmergencyPageProps {
  userId: string;
  onBack: () => void;
}

interface EmergencyAlert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export function FamilyEmergencyPage({ userId, onBack }: FamilyEmergencyPageProps) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [adultId, setAdultId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      
      const connectionRes = await fetch(`${API_BASE_URL}/api/family/loved-one?familyId=${userId}`);
      if (connectionRes.ok) {
        const connectionData = await connectionRes.json();
        setAdultId(connectionData.adultId);

        const alertsRes = await fetch(`${API_BASE_URL}/api/family/emergency-alerts?adultId=${connectionData.adultId}`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.alerts || []);
        }
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, string> = {
      '911_call': 'phone',
      'fall': 'warning',
      'health_emergency': 'local-hospital',
    };
    return icons[type] || 'warning';
  };

  const getAlertColor = (type: string) => {
    const colors: Record<string, string> = {
      '911_call': '#ef4444',
      'fall': '#f59e0b',
      'health_emergency': '#dc2626',
    };
    return colors[type] || '#ef4444';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Alerts</Text>
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
              Connect to your loved one's account to receive emergency alerts.
            </Text>
          </View>
        ) : alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={64} color="#10b981" />
            <Text style={styles.emptyTitle}>No Active Alerts</Text>
            <Text style={styles.emptyText}>
              All clear! You'll be notified if any emergency alerts occur.
            </Text>
          </View>
        ) : (
          <>
            {alerts.map(alert => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  !alert.resolved && { borderColor: getAlertColor(alert.type), borderWidth: 2 },
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIconContainer, { backgroundColor: getAlertColor(alert.type) + '20' }]}>
                    <MaterialIcons
                      name={getAlertIcon(alert.type) as any}
                      size={32}
                      color={getAlertColor(alert.type)}
                    />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertType}>
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  {!alert.resolved && (
                    <View style={styles.unresolvedBadge}>
                      <Text style={styles.unresolvedText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                {alert.resolved && (
                  <View style={styles.resolvedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.resolvedText}>Resolved</Text>
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
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  alertCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  alertIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  alertTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  unresolvedBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unresolvedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  resolvedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
});



