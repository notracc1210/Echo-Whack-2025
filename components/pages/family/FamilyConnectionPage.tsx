import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FamilyConnectionPageProps {
  userId: string;
  onBack: () => void;
}

export function FamilyConnectionPage({ userId, onBack }: FamilyConnectionPageProps) {
  const [adultId, setAdultId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const insets = useSafeAreaInsets();

  const handleConnect = async () => {
    if (!adultId.trim()) {
      Alert.alert('Error', 'Please enter your loved one\'s user ID');
      return;
    }

    setIsConnecting(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/family/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: userId, adultId: adultId.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Success',
          `Successfully connected to ${data.adultName}!`,
          [{ text: 'OK', onPress: onBack }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to connect. Please check the ID and try again.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect. Please check your connection and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connect to Loved One</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="link" size={80} color="#2563eb" />
        </View>

        <Text style={styles.title}>Enter Your Loved One's User ID</Text>
        <Text style={styles.subtitle}>
          Ask your loved one for their user ID to connect and monitor their health and activity.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter user ID (e.g., ADULT001)"
            placeholderTextColor="#9ca3af"
            value={adultId}
            onChangeText={setAdultId}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isConnecting}
            onSubmitEditing={handleConnect}
          />
        </View>

        <TouchableOpacity
          style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="link" size={24} color="#ffffff" />
              <Text style={styles.connectButtonText}>Connect</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Once connected, you'll be able to monitor medications, view activity, and receive emergency alerts.
          </Text>
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
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  connectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
});



