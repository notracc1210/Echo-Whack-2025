/**
 * Medication Notification Utility
 * 
 * Handles scheduling and managing medication reminder notifications.
 * Uses expo-notifications for local notifications.
 */

import * as Notifications from 'expo-notifications';
import { Medication } from './medicationStorage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a medication reminder notification
 */
export async function scheduleMedicationReminder(
  medication: Medication,
  reminderTime: string
): Promise<string | null> {
  try {
    // Request permissions if not already granted
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Parse time string (HH:MM format)
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medication Reminder',
        body: `Time to take ${medication.name} (${medication.dosage})`,
        sound: true,
        data: {
          medicationId: medication.id,
          medicationName: medication.name,
        },
      },
      trigger: {
        date: reminderDate,
        repeats: true, // Repeat daily
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling medication reminder:', error);
    return null;
  }
}

/**
 * Schedule all reminders for a medication
 */
export async function scheduleAllMedicationReminders(medication: Medication): Promise<string[]> {
  const notificationIds: string[] = [];
  
  for (const reminderTime of medication.reminderTimes) {
    const id = await scheduleMedicationReminder(medication, reminderTime);
    if (id) {
      notificationIds.push(id);
    }
  }
  
  return notificationIds;
}

/**
 * Cancel all notifications for a medication
 */
export async function cancelMedicationNotifications(notificationIds: string[]): Promise<void> {
  try {
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

