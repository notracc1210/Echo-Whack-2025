import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VoiceButton } from '../VoiceButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VolunteerMatchingPageProps {
  onBack: () => void;
  onVoiceCommand: (command: string) => void;
  autoStartMatching?: boolean;
  contextQuery?: string | null; // The original query that suggested volunteers (e.g., "My chair is broken")
}

interface Volunteer {
  id: string;
  name: string;
  skillType: string;
  distance: string;
  availability: string;
  rating: number;
}

// Predefined volunteer needs
const volunteerNeeds = [
  { id: 'home-repair', label: 'Home Repair', icon: 'build' },
  { id: 'mobility', label: 'Mobility Assistance', icon: 'accessible' },
  { id: 'grocery', label: 'Grocery / Errands', icon: 'shopping-cart' },
  { id: 'companionship', label: 'Companionship', icon: 'people' },
  { id: 'tech', label: 'Tech Help', icon: 'computer' },
  { id: 'medical-transport', label: 'Medical Transportation', icon: 'local-hospital' },
];

// Mock volunteer data - in a real app, this would come from a backend API
const mockVolunteers: Volunteer[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    skillType: 'Home Repair',
    distance: '0.5 mi',
    availability: 'Available now',
    rating: 4.9,
  },
  {
    id: '2',
    name: 'Michael Chen',
    skillType: 'Tech Help',
    distance: '1.2 mi',
    availability: 'Available in 30 min',
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Emma Williams',
    skillType: 'Grocery / Errands',
    distance: '0.8 mi',
    availability: 'Available now',
    rating: 5.0,
  },
  {
    id: '4',
    name: 'David Brown',
    skillType: 'Medical Transportation',
    distance: '1.5 mi',
    availability: 'Available in 1 hour',
    rating: 4.7,
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    skillType: 'Companionship',
    distance: '0.3 mi',
    availability: 'Available now',
    rating: 4.9,
  },
];

export function VolunteerMatchingPage({ onBack, onVoiceCommand, autoStartMatching, contextQuery }: VolunteerMatchingPageProps) {
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [customNeed, setCustomNeed] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [hasAutoMatched, setHasAutoMatched] = useState(false);
  const insets = useSafeAreaInsets();

  const handleNeedSelection = useCallback((needId: string | null, customText?: string) => {
    const needType = needId || customText;
    if (!needType) return;

    setSelectedNeed(needType);
    setIsMatching(true);

    // Simulate matching process with location, availability, and skill type matching
    setTimeout(() => {
      // Filter volunteers based on skill type match
      const needLabel = needId 
        ? volunteerNeeds.find(n => n.id === needId)?.label || ''
        : customText || '';

      let matchedVolunteers = mockVolunteers.filter(v => {
        // Match by skill type (case-insensitive partial match)
        const skillMatch = needLabel.toLowerCase().includes(v.skillType.toLowerCase()) ||
                          v.skillType.toLowerCase().includes(needLabel.toLowerCase()) ||
                          // Allow some fuzzy matching
                          (needLabel.toLowerCase().includes('tech') && v.skillType.includes('Tech')) ||
                          (needLabel.toLowerCase().includes('errand') && v.skillType.includes('Errands')) ||
                          (needLabel.toLowerCase().includes('grocery') && v.skillType.includes('Grocery')) ||
                          (needLabel.toLowerCase().includes('companion') && v.skillType.includes('Companionship')) ||
                          (needLabel.toLowerCase().includes('repair') && v.skillType.includes('Repair')) ||
                          (needLabel.toLowerCase().includes('transport') && v.skillType.includes('Transportation')) ||
                          (needLabel.toLowerCase().includes('mobility') && v.skillType.includes('Mobility'));

        // Prioritize available volunteers
        const isAvailable = v.availability.toLowerCase().includes('now') || 
                          v.availability.toLowerCase().includes('30 min');

        // Sort by: skill match first, then availability, then distance
        return skillMatch;
      });

      // If no exact match, show all volunteers sorted by distance
      if (matchedVolunteers.length === 0) {
        matchedVolunteers = [...mockVolunteers];
      }

      // Sort by: exact match, availability (now > soon), then distance
      matchedVolunteers.sort((a, b) => {
        const aAvailable = a.availability.toLowerCase().includes('now');
        const bAvailable = b.availability.toLowerCase().includes('now');
        if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
        
        const aDistance = parseFloat(a.distance);
        const bDistance = parseFloat(b.distance);
        return aDistance - bDistance;
      });

      // Limit to top 3 matches
      setVolunteers(matchedVolunteers.slice(0, 3));
      setIsMatching(false);
    }, 2000);
  }, []);

  // Auto-start matching if coming from health services page
  useEffect(() => {
    if (autoStartMatching) {
      // Auto-select medical transportation as default need since they're coming from health services
      handleNeedSelection('medical-transport');
    }
  }, [autoStartMatching, handleNeedSelection]);

  // Auto-match based on context query when user confirms matching
  useEffect(() => {
    if (contextQuery && !hasAutoMatched && !selectedNeed) {
      // Extract need type from context query
      const lowerQuery = contextQuery.toLowerCase();
      
      // Try to match to predefined needs
      let matchedNeedId: string | null = null;
      
      // Check for home repair keywords (chair, broken, fix, repair, etc.)
      if (lowerQuery.includes('chair') || lowerQuery.includes('broken') || 
          lowerQuery.includes('repair') || lowerQuery.includes('fix') ||
          lowerQuery.includes('maintenance') || lowerQuery.includes('broken')) {
        matchedNeedId = 'home-repair';
      } else if (lowerQuery.includes('mobility') || lowerQuery.includes('wheelchair') || 
                 lowerQuery.includes('walking') || lowerQuery.includes('assistance')) {
        matchedNeedId = 'mobility';
      } else if (lowerQuery.includes('grocery') || lowerQuery.includes('shopping') || 
                 lowerQuery.includes('errand') || lowerQuery.includes('pick up') ||
                 lowerQuery.includes('pickup') || lowerQuery.includes('medicine from') ||
                 lowerQuery.includes('prescription from') || lowerQuery.includes('pharmacy') ||
                 lowerQuery.includes('from cvs') || lowerQuery.includes('from walgreens')) {
        matchedNeedId = 'grocery';
      } else if (lowerQuery.includes('companion') || lowerQuery.includes('friend') || 
                 lowerQuery.includes('visit') || lowerQuery.includes('lonely')) {
        matchedNeedId = 'companionship';
      } else if (lowerQuery.includes('tech') || lowerQuery.includes('computer') || 
                 lowerQuery.includes('phone') || lowerQuery.includes('internet')) {
        matchedNeedId = 'tech';
      } else if (lowerQuery.includes('medical') || lowerQuery.includes('transport') || 
                 lowerQuery.includes('doctor') || lowerQuery.includes('hospital')) {
        matchedNeedId = 'medical-transport';
      }
      
      if (matchedNeedId) {
        setHasAutoMatched(true);
        handleNeedSelection(matchedNeedId);
      } else {
        // Use the context query as a custom need
        setHasAutoMatched(true);
        handleNeedSelection(null, contextQuery);
      }
    }
  }, [contextQuery, hasAutoMatched, selectedNeed, handleNeedSelection]);

  // Handle voice commands locally for volunteer matching
  const handleVoiceCommandLocal = (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Check if this is an affirmative response to match based on context
    const isAffirmativeMatch = lowerCommand.includes('yes') || 
                                lowerCommand.includes('match') || 
                                lowerCommand.includes('find') ||
                                lowerCommand.includes('sure') ||
                                lowerCommand.includes('ok') ||
                                lowerCommand.includes('okay');
    
    // If user confirms matching and we have context query, use it
    if (isAffirmativeMatch && contextQuery && !hasAutoMatched) {
      const lowerQuery = contextQuery.toLowerCase();
      
      // Try to match to predefined needs
      let matchedNeedId: string | null = null;
      
      if (lowerQuery.includes('chair') || lowerQuery.includes('broken') || 
          lowerQuery.includes('repair') || lowerQuery.includes('fix') ||
          lowerQuery.includes('maintenance')) {
        matchedNeedId = 'home-repair';
      } else if (lowerQuery.includes('mobility') || lowerQuery.includes('wheelchair') || 
                 lowerQuery.includes('walking') || lowerQuery.includes('assistance')) {
        matchedNeedId = 'mobility';
      } else if (lowerQuery.includes('grocery') || lowerQuery.includes('shopping') || 
                 lowerQuery.includes('errand') || lowerQuery.includes('pick up') ||
                 lowerQuery.includes('pickup') || lowerQuery.includes('medicine from') ||
                 lowerQuery.includes('prescription from') || lowerQuery.includes('pharmacy') ||
                 lowerQuery.includes('from cvs') || lowerQuery.includes('from walgreens')) {
        matchedNeedId = 'grocery';
      } else if (lowerQuery.includes('companion') || lowerQuery.includes('friend') || 
                 lowerQuery.includes('visit') || lowerQuery.includes('lonely')) {
        matchedNeedId = 'companionship';
      } else if (lowerQuery.includes('tech') || lowerQuery.includes('computer') || 
                 lowerQuery.includes('phone') || lowerQuery.includes('internet')) {
        matchedNeedId = 'tech';
      } else if (lowerQuery.includes('medical') || lowerQuery.includes('transport') || 
                 lowerQuery.includes('doctor') || lowerQuery.includes('hospital')) {
        matchedNeedId = 'medical-transport';
      }
      
      if (matchedNeedId) {
        setHasAutoMatched(true);
        handleNeedSelection(matchedNeedId);
        return;
      } else {
        setHasAutoMatched(true);
        handleNeedSelection(null, contextQuery);
        return;
      }
    }
    
    // Try to match command to predefined volunteer needs
    const matchedNeed = volunteerNeeds.find(need => {
      const needLabel = need.label.toLowerCase();
      return lowerCommand.includes(needLabel.toLowerCase()) ||
             lowerCommand.includes(need.id) ||
             (need.id === 'home-repair' && (lowerCommand.includes('repair') || lowerCommand.includes('fix') || lowerCommand.includes('maintenance'))) ||
             (need.id === 'mobility' && (lowerCommand.includes('mobility') || lowerCommand.includes('wheelchair') || lowerCommand.includes('walking'))) ||
             (need.id === 'grocery' && (lowerCommand.includes('grocery') || lowerCommand.includes('shopping') || 
                                       lowerCommand.includes('errand') || lowerCommand.includes('pick up') ||
                                       lowerCommand.includes('pickup') || lowerCommand.includes('medicine from') ||
                                       lowerCommand.includes('prescription from') || lowerCommand.includes('pharmacy'))) ||
             (need.id === 'companionship' && (lowerCommand.includes('companion') || lowerCommand.includes('friend') || lowerCommand.includes('visit'))) ||
             (need.id === 'tech' && (lowerCommand.includes('tech') || lowerCommand.includes('computer') || lowerCommand.includes('phone') || lowerCommand.includes('internet'))) ||
             (need.id === 'medical-transport' && (lowerCommand.includes('medical') || lowerCommand.includes('transport') || lowerCommand.includes('doctor') || lowerCommand.includes('hospital')));
    });

    if (matchedNeed) {
      handleNeedSelection(matchedNeed.id);
    } else {
      // Use the command as a custom need
      handleNeedSelection(null, command);
    }
  };


  const handleReset = () => {
    setSelectedNeed(null);
    setCustomNeed('');
    setVolunteers([]);
    setIsMatching(false);
    // Don't reset hasAutoMatched if we have contextQuery - prevent re-triggering auto-match
    // Only reset if user explicitly wants to go back to need selection
    if (!contextQuery) {
      setHasAutoMatched(false);
    }
  };

  const handleBack = () => {
    // If we have context query and auto-matched, go back to previous page
    // Otherwise, just reset to need selection
    if (contextQuery && hasAutoMatched && selectedNeed) {
      // User came from info page with context, go back there
      onBack();
    } else if (selectedNeed) {
      // User manually selected a need, reset to need selection screen
      handleReset();
    } else {
      // No selection yet, go back to previous page
      onBack();
    }
  };

  // Show matching results
  if (selectedNeed && (volunteers.length > 0 || isMatching)) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Volunteers</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {isMatching ? (
            <View style={styles.loadingContent}>
              <Text style={styles.loadingTitle}>Finding volunteers...</Text>
              <Text style={styles.loadingSubtitle}>
                Matching based on location, availability, and skills
              </Text>
              <View style={styles.loadingCircle}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.needDisplayCard}>
                <MaterialIcons name="check-circle" size={32} color="#10b981" />
                <Text style={styles.needDisplayText}>
                  Looking for: {volunteerNeeds.find(n => n.id === selectedNeed)?.label || selectedNeed}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Recommended Volunteers</Text>

              {volunteers.map((volunteer) => (
                <View key={volunteer.id} style={styles.volunteerCard}>
                  <View style={styles.volunteerHeader}>
                    <View style={styles.avatar}>
                      <MaterialIcons name="person" size={32} color="#ffffff" />
                    </View>
                    <View style={styles.volunteerInfo}>
                      <Text style={styles.volunteerName}>{volunteer.name}</Text>
                      <View style={styles.volunteerDetails}>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="star" size={20} color="#fbbf24" />
                          <Text style={styles.detailText}>{volunteer.rating}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="place" size={20} color="#2563eb" />
                          <Text style={styles.detailText}>{volunteer.distance}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <MaterialIcons name="access-time" size={20} color="#10b981" />
                          <Text style={styles.detailText}>{volunteer.availability}</Text>
                        </View>
                      </View>
                      <View style={styles.skillBadge}>
                        <Text style={styles.skillText}>{volunteer.skillType}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.contactButton}>
                    <Text style={styles.contactButtonText}>Contact Volunteer</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
          <VoiceButton onCommand={handleVoiceCommandLocal} label="Ask something else" size="medium" />
        </View>
      </View>
    );
  }

  // Show need selection screen
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={32} color="#2563eb" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer Matching</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.questionSection}>
          <Text style={styles.questionTitle}>What kind of help do you need?</Text>
          <Text style={styles.questionSubtitle}>
            Select from the options below or describe your need
          </Text>
        </View>

        {/* Need Options */}
        <View style={styles.needsGrid}>
          {volunteerNeeds.map((need) => (
            <TouchableOpacity
              key={need.id}
              style={styles.needCard}
              onPress={() => handleNeedSelection(need.id)}
            >
              <View style={styles.needIconContainer}>
                <MaterialIcons name={need.icon as any} size={40} color="#2563eb" />
              </View>
              <Text style={styles.needLabel}>{need.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Need Input */}
        <View style={styles.customNeedSection}>
          <Text style={styles.customNeedLabel}>Other (describe your need)</Text>
          <TextInput
            style={styles.customNeedInput}
            placeholder="e.g., Pet care, Gardening, etc."
            placeholderTextColor="#9ca3af"
            value={customNeed}
            onChangeText={setCustomNeed}
            multiline
          />
          {customNeed.trim() && (
            <TouchableOpacity
              style={styles.customNeedButton}
              onPress={() => handleNeedSelection(null, customNeed)}
            >
              <Text style={styles.customNeedButtonText}>Find Volunteers</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        <VoiceButton onCommand={handleVoiceCommandLocal} label="Ask something else" size="medium" />
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
    paddingVertical: 32,
    gap: 24,
  },
  questionSection: {
    marginBottom: 8,
  },
  questionTitle: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  questionSubtitle: {
    color: '#6b7280',
    fontSize: 20,
    textAlign: 'center',
  },
  needsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  needCard: {
    width: '47%',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#dbeafe',
  },
  needIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needLabel: {
    color: '#111827',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  customNeedSection: {
    marginTop: 8,
  },
  customNeedLabel: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  customNeedInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  customNeedButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  customNeedButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingTitle: {
    color: '#111827',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtitle: {
    color: '#6b7280',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 48,
  },
  loadingCircle: {
    width: 128,
    height: 128,
    borderRadius: 9999,
    backgroundColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  needDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  needDisplayText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 16,
  },
  volunteerCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  volunteerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  volunteerInfo: {
    flex: 1,
  },
  volunteerName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  volunteerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    color: '#4b5563',
    fontSize: 18,
  },
  skillBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  skillText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
});
