import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { Page } from '../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getHealthServices, HealthService } from '../../utils/api';

interface HealthServicesPageProps {
  onBack: () => void;
  onNavigate: (page: Page) => void;
  onVoiceCommand: (command: string) => void;
}

// Development mode: Set custom location for testing in iOS Simulator
// To use: Set these values to your desired test coordinates (or null to use actual location)
const DEV_MODE_LOCATION: { latitude: number; longitude: number } | null = null;
// Example: { latitude: 37.7749, longitude: -122.4194 } // San Francisco
// Example: { latitude: 40.7128, longitude: -74.0060 } // New York
// Note: In iOS Simulator, you can also set location via Features > Location > Custom Location

export function HealthServicesPage({ onBack, onNavigate, onVoiceCommand }: HealthServicesPageProps) {
  const insets = useSafeAreaInsets();
  const [healthServices, setHealthServices] = useState<HealthService[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    requestLocationAndFetchServices();
  }, []);

  const requestLocationAndFetchServices = async () => {
    try {
      setLoading(true);
      setLocationError(null);

      let latitude: number;
      let longitude: number;

      // Use dev mode location if set, otherwise get actual location
      if (DEV_MODE_LOCATION) {
        console.log('[Dev Mode] Using custom location:', DEV_MODE_LOCATION);
        latitude = DEV_MODE_LOCATION.latitude;
        longitude = DEV_MODE_LOCATION.longitude;
      } else {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);

        if (status !== 'granted') {
          setLocationError('Location permission is required to find nearby health services.');
          setLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      // Fetch health services with timeout protection
      const response = await Promise.race([
        getHealthServices(latitude, longitude),
        new Promise<HealthServicesResponse>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout, please check network connection')), 30000)
        ),
      ]);
      
      // Sort services: open first, then by distance (nearest first)
      const sortedServices = (response.services || []).sort((a, b) => {
        // Check if service is open (hours starts with "Open now")
        const aIsOpen = a.hours?.toLowerCase().startsWith('open now') || false;
        const bIsOpen = b.hours?.toLowerCase().startsWith('open now') || false;
        
        // If one is open and the other isn't, open comes first
        if (aIsOpen && !bIsOpen) return -1;
        if (!aIsOpen && bIsOpen) return 1;
        
        // Both are open or both are closed - sort by distance
        // Extract numeric distance value (e.g., "2.5 mi" -> 2.5)
        const extractDistance = (distanceStr: string): number => {
          const match = distanceStr?.match(/(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : Infinity;
        };
        
        const aDistance = extractDistance(a.distance);
        const bDistance = extractDistance(b.distance);
        
        return aDistance - bDistance;
      });
      
      setHealthServices(sortedServices);
    } catch (error: any) {
      console.error('Error fetching health services:', error);
      const errorMessage = error?.message || 'Failed to load health services. Please try again.';
      setLocationError(errorMessage);
      // Ensure loading is always cleared
      setHealthServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLocation = () => {
    requestLocationAndFetchServices();
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Services Nearby</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Finding health services near you...</Text>
          </View>
        ) : locationError ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="location-off" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>Location Access Needed</Text>
            <Text style={styles.errorText}>{locationError}</Text>
            <TouchableOpacity 
              onPress={handleRequestLocation}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        ) : healthServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="local-hospital" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No health services found nearby</Text>
            <TouchableOpacity 
              onPress={handleRequestLocation}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          healthServices.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceContent}>
                <View style={styles.iconBox}>
                  <MaterialIcons name="favorite" size={32} color="#ef4444" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceType}>{service.type}</Text>
                  <View style={styles.serviceDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={20} color="#4b5563" />
                      <Text style={styles.detailText}>{service.hours}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="place" size={20} color="#2563eb" />
                      <Text style={styles.detailTextBlue}>{service.distance}</Text>
                    </View>
                    {service.address && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="location-on" size={20} color="#4b5563" />
                        <Text style={styles.detailText}>{service.address}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Volunteer Prompt */}
        <View style={styles.volunteerPrompt}>
          <Text style={styles.promptText}>
            Would you like help from a volunteer?
          </Text>
          <TouchableOpacity 
            onPress={() => onNavigate('volunteer')}
            style={styles.volunteerButton}
          >
            <Text style={styles.volunteerButtonText}>Yes, find a volunteer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <View style={styles.footerContent}>
          <VoiceButton onCommand={onVoiceCommand} label="Ask another question" size="medium" />
          <TouchableOpacity style={styles.typeButton}>
            <Text style={styles.typeButtonText}>Type instead</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  serviceContent: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: '#111827',
    fontSize: 24,
    marginBottom: 4,
  },
  serviceType: {
    color: '#4b5563',
    fontSize: 20,
    marginBottom: 12,
  },
  serviceDetails: {
    gap: 8,
    paddingRight: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  detailText: {
    color: '#4b5563',
    fontSize: 20,
    paddingRight: 8,
  },
  detailTextBlue: {
    color: '#2563eb',
    fontSize: 20,
  },
  volunteerPrompt: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  promptText: {
    color: '#ffffff',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  volunteerButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  volunteerButtonText: {
    color: '#2563eb',
    fontSize: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  footerContent: {
    alignItems: 'center',
    gap: 16,
  },
  typeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  typeButtonText: {
    color: '#2563eb',
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    color: '#4b5563',
    fontSize: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 28,
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 20,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    color: '#4b5563',
    fontSize: 20,
    textAlign: 'center',
  },
});
