import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerProfilePageProps {
  userId: string;
  onBack: () => void;
}

const SKILLS = [
  { id: 'home-repair', label: 'Home Repair' },
  { id: 'mobility', label: 'Mobility Assistance' },
  { id: 'grocery', label: 'Grocery / Errands' },
  { id: 'companionship', label: 'Companionship' },
  { id: 'tech', label: 'Tech Help' },
  { id: 'medical-transport', label: 'Medical Transportation' },
];

export function VolunteerProfilePage({ userId, onBack }: VolunteerProfilePageProps) {
  const [name, setName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/profile?volunteerId=${userId}`);
      const data = await response.json();
      setName(data.name || '');
      setSkills(data.skills || []);
      setBio(data.bio || '');
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    if (skills.includes(skillId)) {
      setSkills(skills.filter(s => s !== skillId));
    } else {
      setSkills([...skills, skillId]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetch(`${API_BASE_URL}/api/volunteer/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volunteerId: userId, skills, bio }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            editable={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.sectionSubtitle}>Select the types of help you can provide</Text>
          <View style={styles.skillsGrid}>
            {SKILLS.map(skill => (
              <TouchableOpacity
                key={skill.id}
                style={[
                  styles.skillChip,
                  skills.includes(skill.id) && styles.skillChipActive
                ]}
                onPress={() => toggleSkill(skill.id)}
              >
                <Text style={[
                  styles.skillText,
                  skills.includes(skill.id) && styles.skillTextActive
                ]}>
                  {skill.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.sectionSubtitle}>Tell others about yourself</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a short bio..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  skillChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  skillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  skillTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});



