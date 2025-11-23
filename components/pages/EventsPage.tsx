import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EventsPageProps {
  onBack: () => void;
  onVoiceCommand: (command: string) => void;
}

const events = [
  {
    id: 1,
    name: 'Morning Walking Group',
    time: 'Today at 9:00 AM',
    distance: '0.3 mi',
    icon: '🚶',
  },
  {
    id: 2,
    name: 'Community Lunch',
    time: 'Tomorrow at 12:00 PM',
    distance: '0.5 mi',
    icon: '🍽️',
  },
  {
    id: 3,
    name: 'Arts & Crafts Workshop',
    time: 'Wed at 2:00 PM',
    distance: '0.7 mi',
    icon: '🎨',
  },
  {
    id: 4,
    name: 'Book Club Meeting',
    time: 'Thu at 3:00 PM',
    distance: '1.2 mi',
    icon: '📚',
  },
];

export function EventsPage({ onBack, onVoiceCommand }: EventsPageProps) {
  const insets = useSafeAreaInsets();
  
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
        <Text style={styles.headerTitle}>Upcoming Events Near You</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {events.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventContent}>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{event.icon}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventName}>{event.name}</Text>
                <View style={styles.eventDetails}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="access-time" size={20} color="#4b5563" />
                    <Text style={styles.detailText}>{event.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="place" size={20} color="#2563eb" />
                    <Text style={styles.detailTextBlue}>{event.distance}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <View style={styles.footerContent}>
          <VoiceButton onCommand={onVoiceCommand} label="Tell me what you're looking for" size="medium" />
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
  eventCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  eventContent: {
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
  iconEmoji: {
    fontSize: 32,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    color: '#111827',
    fontSize: 24,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#4b5563',
    fontSize: 20,
  },
  detailTextBlue: {
    color: '#2563eb',
    fontSize: 20,
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
});
