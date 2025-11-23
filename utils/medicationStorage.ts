/**
 * Medication Storage Utility
 * 
 * Handles local storage of medication data using AsyncStorage.
 * Stores medication information including name, dosage, frequency, and reminder times.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Daily", "Twice daily", "As needed"
  reminderTimes: string[]; // Array of time strings in HH:MM format
  createdAt: string;
  updatedAt: string;
}

const MEDICATION_STORAGE_KEY = '@medications';

/**
 * Get all stored medications
 */
export async function getMedications(): Promise<Medication[]> {
  try {
    const data = await AsyncStorage.getItem(MEDICATION_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting medications:', error);
    return [];
  }
}

/**
 * Save a medication
 */
export async function saveMedication(medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
  try {
    const medications = await getMedications();
    const newMedication: Medication = {
      ...medication,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    medications.push(newMedication);
    await AsyncStorage.setItem(MEDICATION_STORAGE_KEY, JSON.stringify(medications));
    return newMedication;
  } catch (error) {
    console.error('Error saving medication:', error);
    throw error;
  }
}

/**
 * Update a medication
 */
export async function updateMedication(id: string, updates: Partial<Medication>): Promise<Medication | null> {
  try {
    const medications = await getMedications();
    const index = medications.findIndex(m => m.id === id);
    if (index === -1) return null;
    
    medications[index] = {
      ...medications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(MEDICATION_STORAGE_KEY, JSON.stringify(medications));
    return medications[index];
  } catch (error) {
    console.error('Error updating medication:', error);
    throw error;
  }
}

/**
 * Delete a medication
 */
export async function deleteMedication(id: string): Promise<boolean> {
  try {
    const medications = await getMedications();
    const filtered = medications.filter(m => m.id !== id);
    await AsyncStorage.setItem(MEDICATION_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting medication:', error);
    return false;
  }
}

