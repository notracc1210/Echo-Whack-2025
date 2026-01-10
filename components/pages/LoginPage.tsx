import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchWithTimeout } from '../../utils/api';

interface LoginPageProps {
  onLogin: (userId: string, role: string, name: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter your user ID');
      return;
    }

    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      
      console.log(`[Login] Attempting login with ID: ${userId.trim()} at ${API_BASE_URL}`);
      
      // Use fetchWithTimeout with a shorter 5-second timeout for better UX
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/api/user-lookup`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userId.trim() }),
        },
        5000 // 5 second timeout for login
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to lookup user');
      }

      const data = await response.json();
      console.log('[Login] Success:', data);
      
      if (data.role && data.name) {
        onLogin(data.userId, data.role, data.name);
      } else {
        Alert.alert('Error', 'Invalid user ID. Please try again.');
      }
    } catch (error: any) {
      console.error('[Login] Error:', error);
      
      let errorMessage = error.message || 'Failed to login';
      
      // Handle AbortError specifically (network timeout or connection refused)
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Aborted')) {
        errorMessage = `Unable to connect to server at ${API_BASE_URL}.\n\nPlease check:\n1. Server is running: cd server && npm start\n2. Network connection is working\n3. You are on the same network as the server\n4. If using a device, ensure it can reach ${API_BASE_URL}`;
      } else if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
        errorMessage = `Network error: Unable to connect to ${API_BASE_URL}.\n\nPlease check:\n1. Server is running\n2. Network connection is working\n3. Server address is correct: ${API_BASE_URL}`;
      }
      
      Alert.alert(
        'Login Failed', 
        errorMessage + '\n\nServer: ' + (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(32, insets.top + 32) }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="account-circle" size={80} color="#2563eb" />
          <Text style={styles.title}>Welcome to Echo</Text>
          <Text style={styles.subtitle}>Enter your user ID to continue</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your ID (e.g., ADULT001, VOL001, FAM001)"
            placeholderTextColor="#9ca3af"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="login" size={24} color="#ffffff" />
              <Text style={styles.loginButtonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.helpText}>
          <Text style={styles.helpTextContent}>
            Need help? Contact your administrator for your user ID.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpTextContent: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
