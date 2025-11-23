/**
 * Medication Notification Utility
 * 
 * Handles scheduling and managing medication reminder notifications.
 * Uses expo-notifications for local notifications.
 */

import * as Notifications from 'expo-notifications';
import { Medication } from './medicationStorage';

// Track when notifications were scheduled to prevent immediate triggers
const scheduledNotifications = new Map<string, number>();

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check if this notification was just scheduled (within last 30 seconds)
    // If so, suppress it to prevent immediate triggers
    const notificationId = notification.request.identifier;
    const scheduledTime = scheduledNotifications.get(notificationId);
    
    if (scheduledTime) {
      const timeSinceScheduled = Date.now() - scheduledTime;
      // If notification fires within 30 seconds of scheduling, suppress it
      if (timeSinceScheduled < 30000) {
        scheduledNotifications.delete(notificationId);
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
      scheduledNotifications.delete(notificationId);
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

/**
 * Request notification permissions
 * Only shows pop-up if permissions are not already granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // First check if permissions are already granted
    const existingPermissions = await Notifications.getPermissionsAsync();
    if (existingPermissions.status === 'granted') {
      return true;
    }
    
    // Only request permissions if not already granted (this will show pop-up)
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
    
    // Use DailyTriggerInput format - this automatically schedules for the next occurrence
    // and repeats daily at the specified hour and minute
    // If the time has passed today, Expo will schedule it for tomorrow automatically
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medication Reminder',
        body: `Time to take ${medication.name} (${medication.dosage})`,
        sound: true,
        data: {
          medicationId: medication.id,
          medicationName: medication.name,
          reminderTime: reminderTime,
        },
      },
      trigger: {
        hour: hours,
        minute: minutes,
      },
    });
    
    // Track when this notification was scheduled to prevent immediate triggers
    if (notificationId) {
      scheduledNotifications.set(notificationId, Date.now());
      // Clean up after 1 minute (notification should have fired or been suppressed by then)
      setTimeout(() => {
        scheduledNotifications.delete(notificationId);
      }, 60000);
    }

    // Calculate and log when the next occurrence will be
    const now = new Date();
    const nextOccurrence = new Date();
    nextOccurrence.setHours(hours, minutes, 0, 0);
    // If the time has passed today, it will be scheduled for tomorrow
    if (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }
    const nextOccurrenceStr = nextOccurrence.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    console.log(`Scheduled daily reminder for ${medication.name} at ${reminderTime}. Next occurrence: ${nextOccurrenceStr}`);
    
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
 * Cancel all notifications for a medication by notification IDs
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
 * Cancel all notifications for a specific medication by medication ID
 */
export async function cancelMedicationNotificationsById(medicationId: string): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const medicationNotifications = allNotifications.filter(
      (notification) => notification.content.data?.medicationId === medicationId
    );
    
    for (const notification of medicationNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Cancelled ${medicationNotifications.length} notifications for medication ${medicationId}`);
  } catch (error) {
    console.error('Error canceling medication notifications:', error);
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

