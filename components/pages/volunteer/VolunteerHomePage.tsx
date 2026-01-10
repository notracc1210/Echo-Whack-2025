import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

interface VolunteerHomePageProps {
  userId: string;
  userName: string;
  onNavigate: (page: 'home' | 'requests' | 'schedule' | 'matches' | 'profile' | 'history') => void;
  onLogout: () => void;
}

export function VolunteerHomePage({ userId, userName, onNavigate, onLogout }: VolunteerHomePageProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [volunteerLocation, setVolunteerLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      let currentLocation = null;

      // Request permission and get real location
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          currentLocation = {
            lat: location.coords.latitude,
            lng: location.coords.longitude
          };
          setVolunteerLocation(currentLocation);
        } else {
          // Fallback to profile location if permission denied
          const profileRes = await fetch(`${API_BASE_URL}/api/volunteer/profile?volunteerId=${userId}`);
          const profileData = await profileRes.json();
          if (profileData.location) {
            currentLocation = profileData.location;
            setVolunteerLocation(profileData.location);
          }
        }
      } catch (locError) {
        console.warn('Error getting location:', locError);
        // Fallback to profile location
        const profileRes = await fetch(`${API_BASE_URL}/api/volunteer/profile?volunteerId=${userId}`);
        const profileData = await profileRes.json();
        if (profileData.location) {
          currentLocation = profileData.location;
          setVolunteerLocation(profileData.location);
        }
      }

      // Fetch pending requests count
      const requestsRes = await fetch(`${API_BASE_URL}/api/volunteer/requests?volunteerId=${userId}`);
      const requestsData = await requestsRes.json();
      const pending = requestsData.requests?.filter((r: any) => r.status === 'pending').length || 0;
      setPendingCount(pending);

      // Fetch active matches
      const matchesRes = await fetch(`${API_BASE_URL}/api/volunteer/matches?volunteerId=${userId}`);
      const matchesData = await matchesRes.json();
      
      // If we have matches but no location (or if location is null), assign a random location near the volunteer
      let processedMatches = matchesData.matches || [];
      if (currentLocation) {
        processedMatches = processedMatches.map((match: any) => {
          // If match doesn't have a location, generate one nearby (within ~1-3 miles)
          if (!match.location || (match.location.lat === 0 && match.location.lng === 0)) {
             // Random offset between 0.01 and 0.03 degrees (approx 0.7-2 miles)
             const latOffset = (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
             const lngOffset = (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
             return {
               ...match,
               location: {
                 lat: currentLocation.lat + latOffset,
                 lng: currentLocation.lng + lngOffset
               }
             };
          }
          return match;
        });
      }
      
      setMatches(processedMatches);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; // Distance in km
    return (d * 0.621371).toFixed(1); // Convert to miles
  };

  const handleStartNavigation = (lat: number, lng: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(16, insets.top + 16) }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.subtitle}>Volunteer Dashboard</Text>
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
        ) : (
          <>
            {/* Active Match Map Card */}
            {matches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Match</Text>
                {matches.map((match) => (
                  <View key={match.id} style={styles.mapCard}>
                    {/* Map Area */}
                    <View style={styles.mapArea}>
                      {volunteerLocation && match.location ? (
                        <MapView
                          style={styles.map}
                          provider={PROVIDER_DEFAULT}
                          showsUserLocation={true}
                          showsMyLocationButton={true}
                          initialRegion={{
                            latitude: (volunteerLocation.lat + match.location.lat) / 2,
                            longitude: (volunteerLocation.lng + match.location.lng) / 2,
                            latitudeDelta: Math.abs(volunteerLocation.lat - match.location.lat) * 1.5 + 0.02,
                            longitudeDelta: Math.abs(volunteerLocation.lng - match.location.lng) * 1.5 + 0.02,
                          }}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
                        >
                          <Marker
                            coordinate={{ latitude: match.location.lat, longitude: match.location.lng }}
                            title={match.adultName}
                          >
                            <View style={[styles.marker, styles.markerTarget]}>
                              <MaterialIcons name="location-on" size={20} color="#fff" />
                            </View>
                          </Marker>
                          <Polyline
                            coordinates={[
                              { latitude: volunteerLocation.lat, longitude: volunteerLocation.lng },
                              { latitude: match.location.lat, longitude: match.location.lng },
                            ]}
                            strokeColor="#2563eb"
                            strokeWidth={4}
                            lineDashPattern={[1]}
                          />
                        </MapView>
                      ) : (
                        <View style={styles.mapGrid}>
                          <View style={styles.mapLineHorizontal} />
                          <View style={styles.mapLineVertical} />
                        </View>
                      )}

                      {/* Navigation Button Overlay */}
                      <TouchableOpacity 
                        style={styles.navigationButton}
                        onPress={() => handleStartNavigation(match.location.lat, match.location.lng, match.adultName)}
                      >
                        <MaterialIcons name="navigation" size={24} color="#ffffff" />
                        <Text style={styles.navigationButtonText}>Start Navigation</Text>
                      </TouchableOpacity>

                      {/* Distance Badge Overlay */}
                      <View style={styles.distanceBadge}>
                        <MaterialIcons name="directions-walk" size={16} color="#2563eb" />
                        <Text style={styles.distanceText}>
                          {volunteerLocation && match.location 
                            ? `${calculateDistance(volunteerLocation.lat, volunteerLocation.lng, match.location.lat, match.location.lng)} mi` 
                            : 'Nearby'}
                        </Text>
                      </View>
                    </View>

                    {/* Info Area */}
                    <TouchableOpacity 
                      style={styles.mapCardInfo}
                      onPress={() => onNavigate('matches')}
                    >
                      <View style={styles.mapCardHeader}>
                        <View style={styles.profileRow}>
                          <View style={styles.avatar}>
                            <MaterialIcons name="person" size={24} color="#fff" />
                          </View>
                          <View>
                            <Text style={styles.matchName}>{match.adultName}</Text>
                            <Text style={styles.matchRole}>Older Adult</Text>
                          </View>
                        </View>
                        <View style={styles.typeBadge}>
                          <MaterialIcons 
                            name={
                              match.type === 'grocery' ? 'shopping-cart' :
                              match.type === 'tech' ? 'computer' :
                              match.type === 'home-repair' ? 'build' :
                              match.type === 'medical-transport' ? 'local-hospital' :
                              'volunteer-activism'
                            } 
                            size={16} 
                            color="#2563eb" 
                          />
                          <Text style={styles.typeText}>
                            {match.type.charAt(0).toUpperCase() + match.type.slice(1)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={20} color="#6b7280" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {match.contactInfo?.address || 'Location available in details'}
                        </Text>
                      </View>

                      <View style={styles.infoRow}>
                        <MaterialIcons name="info-outline" size={20} color="#6b7280" />
                        <Text style={styles.infoText} numberOfLines={2}>
                          {match.description || 'No additional details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => onNavigate('requests')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                    <MaterialIcons name="list" size={32} color="#2563eb" />
                    {pendingCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.actionLabel}>View Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => onNavigate('schedule')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <MaterialIcons name="calendar-today" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.actionLabel}>My Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => onNavigate('matches')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                    <MaterialIcons name="handshake" size={32} color="#f59e0b" />
                  </View>
                  <Text style={styles.actionLabel}>My Current Match</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => onNavigate('history')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#fce7f3' }]}>
                    <MaterialIcons name="history" size={32} color="#ec4899" />
                  </View>
                  <Text style={styles.actionLabel}>History</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Section */}
            <TouchableOpacity 
              style={styles.profileCard}
              onPress={() => onNavigate('profile')}
            >
              <MaterialIcons name="account-circle" size={48} color="#2563eb" />
              <View style={styles.profileInfo}>
                <Text style={styles.profileTitle}>Manage Profile</Text>
                <Text style={styles.profileSubtitle}>Update your skills and availability</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  // Map Card Styles
  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mapArea: {
    height: 200, // Increased height for better navigation view
    backgroundColor: '#e0f2fe', 
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  mapLineHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#94a3b8',
  },
  mapLineVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#94a3b8',
  },
  markerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerSelf: {
    backgroundColor: '#3b82f6', // Blue
  },
  markerTarget: {
    backgroundColor: '#ef4444', // Red
  },
  routeLine: {
    width: 40,
    height: 2,
    backgroundColor: '#94a3b8',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  navigationButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    gap: 8,
  },
  navigationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapCardInfo: {
    padding: 16,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  matchRole: {
    fontSize: 12,
    color: '#6b7280',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
  },
  // Quick Actions
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
    position: 'relative',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  // Badge Styles
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
});
