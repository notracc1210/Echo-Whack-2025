import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { HomePage } from "./components/pages/HomePage";
import { GeneralInfoPage } from "./components/pages/GeneralInfoPage";
import { VolunteerMatchingPage } from "./components/pages/VolunteerMatchingPage";
import { EventsPage } from "./components/pages/EventsPage";
import { HealthServicesPage } from "./components/pages/HealthServicesPage";
import { MedicationGuidePage } from "./components/pages/MedicationGuidePage";
import { parseMedicationReminder } from "./utils/api";
import { saveMedication } from "./utils/medicationStorage";
import { scheduleAllMedicationReminders } from "./utils/medicationNotifications";

export type Page =
  | "home"
  | "info"
  | "volunteer"
  | "events"
  | "health"
  | "medication";

interface AppProps {
  onLogout?: () => void;
  initialPage?: Page;
}

export default function App({ onLogout, initialPage = "home" }: AppProps = {}) {
  console.log('App component - onLogout received:', !!onLogout, typeof onLogout, onLogout);
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [shouldAutoStartMatching, setShouldAutoStartMatching] = useState(false);
  // Conversation memory: store last suggested routes from AI
  const [lastSuggestedRoutes, setLastSuggestedRoutes] = useState<string[]>([]);
  // Store the query context when volunteers are suggested (e.g., "My chair is broken")
  const [volunteerContextQuery, setVolunteerContextQuery] = useState<string | null>(null);

  // Check if command is an affirmative response to open suggested routes
  const isAffirmativeResponse = (command: string): boolean => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Hidden command removed - access via login page only

    
    const affirmativePhrases = [
      'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright',
      'open it', 'open that', 'go there', 'go to it', 'take me there',
      'show me', 'let\'s go', 'lets go', 'sounds good', 'that works',
      'yes please', 'yes open it', 'yes open that', 'yes go there',
      'open it for me', 'open that for me', 'go there for me',
      'yes open it for me', 'yes open that for me', 'yes go there for me',
      'sure open it', 'sure open that', 'ok open it', 'ok open that',
      'go ahead', 'proceed', 'do it', 'yes do it',
      'match me', 'match me volunteer', 'yes match me', 'yes match me volunteer',
      'match me with volunteer', 'match me with a volunteer', 'find me a volunteer',
      'yes find me', 'yes find me volunteer', 'yes find me a volunteer'
    ];
    return affirmativePhrases.some(phrase => lowerCommand === phrase || lowerCommand.includes(phrase));
  };

  const handleVoiceCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase().trim();

    // Hidden command removed - access via login page only


    // If on volunteer page, don't route away - let the volunteer page handle it
    if (currentPage === "volunteer") {
      // Stay on volunteer page - the VolunteerMatchingPage will handle the command
      return;
    }

    // Check for affirmative responses when on info page with suggested routes
    // Don't update searchQuery for affirmative responses to preserve original context
    if (currentPage === "info" && lastSuggestedRoutes.length > 0) {
      if (isAffirmativeResponse(command)) {
        // Navigate to the first suggested route
        const firstRoute = lastSuggestedRoutes[0];
        const routeMap: Record<string, Page> = {
          'events': 'events',
          'volunteer': 'volunteer',
          'health': 'health'
        };
        const targetPage = routeMap[firstRoute];
        if (targetPage) {
          // If navigating to volunteer page and we have a context query, keep it
          // Otherwise clear it
          if (targetPage !== 'volunteer') {
            setVolunteerContextQuery(null);
          }
          navigateTo(targetPage);
          // Clear the suggested routes after navigation
          setLastSuggestedRoutes([]);
          return;
        }
      } else {
        // If it's not an affirmative response, clear the old suggestions
        // (new query will set new suggestions via GeneralInfoPage)
        setLastSuggestedRoutes([]);
        setVolunteerContextQuery(null);
        setSearchQuery(command); // Update searchQuery for new query
      }
    } else {
      // Update searchQuery for normal queries
      setSearchQuery(command);
    }

    // Check for pharmacy/pickup scenarios - these should NOT trigger medication reminders
    // Examples: "I want some medicine from CVS", "I need to pick up my medicine", "get medicine from pharmacy"
    const pharmacyPickupKeywords = [
      'from cvs', 'from pharmacy', 'from walgreens', 'from rite aid', 'from target',
      'pick up', 'pickup', 'get from', 'go to', 'buy from', 'get medicine', 'buy medicine',
      'want some medicine', 'need some medicine', 'some medicine from', 'medicine from',
      'prescription from', 'prescription pickup', 'get prescription', 'pick up prescription'
    ];
    const isPharmacyPickup = pharmacyPickupKeywords.some(keyword => lowerCommand.includes(keyword));

    // Check for medication reminder keywords - only trigger for explicit reminder requests
    // Must include reminder-specific language, not just mentions of medicine/medication
    const medicationReminderKeywords = [
      'remind me to take', 'reminder to take', 'remind me take',
      'add medication reminder', 'add reminder', 'set reminder',
      'medication reminder', 'pill reminder', 'remind me', 'reminder for',
      'schedule reminder', 'create reminder'
    ];
    const looksLikeMedicationReminder = medicationReminderKeywords.some(keyword => lowerCommand.includes(keyword));
    
    // Also check if user is explicitly on medication page or explicitly asking about reminders
    // But exclude pharmacy pickup scenarios
    const hasMedicationContext = (
      lowerCommand.includes('take my') && (lowerCommand.includes('medicine') || lowerCommand.includes('medication') || lowerCommand.includes('pill')) ||
      (lowerCommand.includes('remind') && (lowerCommand.includes('medicine') || lowerCommand.includes('medication') || lowerCommand.includes('pill'))) ||
      (lowerCommand.includes('add') && lowerCommand.includes('medication')) ||
      (lowerCommand.includes('set') && lowerCommand.includes('reminder'))
    ) && !isPharmacyPickup;
    
    // If it looks like a medication reminder (and NOT a pharmacy pickup), try to parse and create it
    if ((looksLikeMedicationReminder || hasMedicationContext) && !isPharmacyPickup && currentPage !== "medication") {
      try {
        const parsed = await parseMedicationReminder(command);
        
        const hasName = parsed.name && parsed.name.trim() !== '' && parsed.name !== 'null';
        const hasTimes = parsed.reminderTimes && parsed.reminderTimes.length > 0;
        
        // If we have name and times, automatically create the reminder
        if ((parsed.success || looksLikeMedicationReminder || hasMedicationContext) && hasName && hasTimes) {
          const medicationData = {
            name: parsed.name,
            dosage: parsed.dosage || 'As prescribed',
            frequency: parsed.frequency || 'Daily',
            reminderTimes: parsed.reminderTimes,
          };
          
          try {
            const medication = await saveMedication(medicationData);
            await scheduleAllMedicationReminders(medication);
            
            // Format time for display
            const formatTime = (time24: string): string => {
              const [hours, minutes] = time24.split(':').map(Number);
              const period = hours >= 12 ? 'PM' : 'AM';
              const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
              return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            };
            
            Alert.alert(
              'Medication Reminder Added',
              `Successfully added ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ''} with reminders at ${medication.reminderTimes.map(t => formatTime(t)).join(', ')}.`,
              [
                { text: 'View Reminders', onPress: () => setCurrentPage("medication") },
                { text: 'OK', style: 'cancel' }
              ]
            );
            return; // Don't continue with normal routing
          } catch (saveError) {
            console.error('Error saving medication:', saveError);
            // Continue with normal flow if save fails
          }
        } else if ((parsed.success || looksLikeMedicationReminder || hasMedicationContext) && hasName) {
          // If we have name but no times, navigate to medication page to complete
          setCurrentPage("medication");
          // The MedicationGuidePage will handle pre-filling the form
          return;
        }
      } catch (error) {
        console.error('Error parsing medication reminder:', error);
        // Continue with normal flow if parsing fails
      }
    }

    // Check for pharmacy/pickup scenarios - route to volunteer (errands) or health services
    if (isPharmacyPickup) {
      // Route to info page - AI will suggest both Health Services (pharmacy location) and Volunteer (pickup help)
      setCurrentPage("info");
      return;
    }

    // Check for "fell down" - route to info page to ask about calling 911
    if (
      lowerCommand.includes("fell down") ||
      lowerCommand.includes("just fell down") ||
      lowerCommand.includes("i fell down") ||
      lowerCommand.includes("i just fell")
    ) {
      setCurrentPage("info");
      return;
    }

    // Check for medical conditions (headache, pain, etc.) - route to info page with action options
    const medicalConditions = [
      "headache", "head ache", "migraine",
      "stomach ache", "stomachache", "nausea",
      "chest pain", "back pain", "joint pain",
      "dizziness", "fever", "cough",
      "sore throat", "rash", "injury"
    ];
    const hasMedicalCondition = medicalConditions.some(condition => 
      lowerCommand.includes(condition)
    );
    if (hasMedicalCondition) {
      setCurrentPage("info");
      return;
    }

    // Check for "feeling uncomfortable" - route to info page to ask for more details
    if (
      lowerCommand.includes("feeling uncomfortable") ||
      lowerCommand.includes("i am feeling uncomfortable") ||
      lowerCommand.includes("i'm feeling uncomfortable")
    ) {
      setCurrentPage("info");
      return;
    }

    // Check if user specifies a volunteer type need - route directly to volunteer matching page
    const volunteerTypeKeywords = {
      'home-repair': ['repair', 'fix', 'broken', 'maintenance', 'chair broken', 'broken chair', 
                     'need someone to fix', 'help me fix', 'someone to repair', 'fix my', 'repair my',
                     'broken item', 'something broken', 'need fixing'],
      'mobility': ['mobility', 'wheelchair', 'walking assistance', 'walking help', 'mobility assistance',
                  'help me walk', 'escort', 'walking support', 'mobility support', 'walking escort',
                  'need to walk', 'help walking'],
      'grocery': ['grocery', 'shopping', 'errand', 'errands', 'go shopping', 'buy groceries',
                 'need groceries', 'someone to shop', 'help with shopping', 'grocery help',
                 'shopping help', 'need shopping', 'errand help', 'pick up', 'pickup',
                 'get from', 'go to', 'buy from'],
      'companionship': ['companion', 'friendship', 'visit', 'visitor', 'someone to talk', 
                       'someone to visit', 'friend', 'companionship', 'someone to chat',
                       'lonely', 'feel alone', 'want company', 'want someone to visit',
                       'need someone to talk', 'want to talk to someone'],
      'tech': ['tech', 'computer', 'phone', 'internet', 'technology', 'device', 'help with computer',
              'computer help', 'phone help', 'tech support', 'help with phone', 'help with computer',
              'internet help', 'wifi', 'wi-fi', 'computer broken', 'phone broken', 'device help'],
      'medical-transport': ['medical transport', 'transport to doctor', 'ride to hospital', 'medical ride',
                           'need a ride to doctor', 'need a ride to hospital', 'need transport to',
                           'ride to appointment', 'transport to appointment', 'medical appointment ride',
                           'need a ride for', 'need transport for']
    };

    // Check if command contains volunteer type keywords
    let detectedVolunteerType: string | null = null;
    for (const [type, keywords] of Object.entries(volunteerTypeKeywords)) {
      if (keywords.some(keyword => lowerCommand.includes(keyword))) {
        detectedVolunteerType = type;
        break;
      }
    }

    // If a volunteer type is detected and user is requesting help/finding a volunteer, route directly
    // Only route directly if the command indicates they're looking for help/volunteer (not just mentioning the keyword)
    if (detectedVolunteerType && (
      lowerCommand.includes("volunteer") ||
      lowerCommand.includes("help") ||
      lowerCommand.includes("need") ||
      lowerCommand.includes("want") ||
      lowerCommand.includes("find") ||
      lowerCommand.includes("someone") ||
      lowerCommand.includes("looking for") ||
      lowerCommand.includes("i ") || // Common: "I need tech help", "I want someone to fix"
      lowerCommand.includes("my ") || // Common: "my chair is broken", "my computer"
      lowerCommand.includes("someone to") || // Common: "someone to fix", "someone to shop"
      lowerCommand.includes("looking for") // "looking for help"
    )) {
      // Set context query and navigate directly to volunteer matching page
      setVolunteerContextQuery(command);
      setShouldAutoStartMatching(true);
      setCurrentPage("volunteer");
      return;
    }

    // Route based on command
    // Check for health/doctor requests first (before other routing)
    if (
      lowerCommand.includes("health") ||
      lowerCommand.includes("hospital") ||
      lowerCommand.includes("doctor") ||
      lowerCommand.includes("see a doctor") ||
      lowerCommand.includes("want to see a doctor") ||
      lowerCommand.includes("need to see a doctor") ||
      lowerCommand.includes("see doctor") ||
      lowerCommand.includes("clinic") ||
      lowerCommand.includes("medical care") ||
      lowerCommand.includes("healthcare")
    ) {
      setCurrentPage("health");
    } else if (
      command.toLowerCase().includes("volunteer") ||
      command.toLowerCase().includes("help")
    ) {
      // Clear context query when directly navigating to volunteer page (not from AI suggestion)
      setVolunteerContextQuery(null);
      setShouldAutoStartMatching(false);
      setCurrentPage("volunteer");
    } else if (
      command.toLowerCase().includes("event") ||
      command.toLowerCase().includes("activity")
    ) {
      setCurrentPage("events");
    } else if (
      command.toLowerCase().includes("medication") ||
      command.toLowerCase().includes("medicine") ||
      command.toLowerCase().includes("pill") ||
      command.toLowerCase().includes("symptom") ||
      command.toLowerCase().includes("reminder")
    ) {
      setCurrentPage("medication");
    } else {
      setCurrentPage("info");
    }
  };

  const navigateTo = (page: Page) => {
    // Track if navigating to volunteer from health services page
    if (page === "volunteer" && currentPage === "health") {
      setShouldAutoStartMatching(true);
    } else if (page === "volunteer" && volunteerContextQuery && currentPage === "info") {
      // If navigating to volunteer with context query from info page (AI suggestion), enable auto-matching
      setShouldAutoStartMatching(true);
    } else if (page === "volunteer") {
      // Direct navigation to volunteer page (e.g., clicking button from home) - clear context and don't auto-match
      setVolunteerContextQuery(null);
      setShouldAutoStartMatching(false);
    } else {
      setShouldAutoStartMatching(false);
    }
    setCurrentPage(page);
  };

  const goHome = () => {
    setCurrentPage("home");
    setSearchQuery("");
    setShouldAutoStartMatching(false);
    setLastSuggestedRoutes([]); // Clear conversation memory when going home
    setVolunteerContextQuery(null); // Clear volunteer context when going home
  };

  // Callback to update last suggested routes from GeneralInfoPage
  const updateSuggestedRoutes = (routes: string[]) => {
    setLastSuggestedRoutes(routes);
    // If volunteers are suggested, store the current query as context
    // Only store if it's not an affirmative response (like "yes", "match me", etc.)
    if (routes.includes('volunteer') && searchQuery.trim().length > 0) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      const isAffirmative = isAffirmativeResponse(searchQuery);
      // Only store if it's a real query, not an affirmative response
      if (!isAffirmative) {
        setVolunteerContextQuery(searchQuery);
      }
    } else if (!routes.includes('volunteer')) {
      // Clear context if volunteers are no longer suggested
      setVolunteerContextQuery(null);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.phoneFrame}>
          {/* Page Content */}
          <View style={styles.content}>
            {currentPage === "home" && (
              <HomePage
                onNavigate={navigateTo}
                onVoiceCommand={handleVoiceCommand}
              />
            )}
            {currentPage === "info" && (
              <GeneralInfoPage
                query={searchQuery}
                onBack={goHome}
                onVoiceCommand={handleVoiceCommand}
                onNavigate={navigateTo}
                onSuggestedRoutesChange={updateSuggestedRoutes}
              />
            )}
            {currentPage === "volunteer" && (
              <VolunteerMatchingPage
                onBack={() => {
                  // Clear context query when going back from volunteer page
                  setVolunteerContextQuery(null);
                  setShouldAutoStartMatching(false);
                  // Always go back to home page
                  goHome();
                }}
                onVoiceCommand={handleVoiceCommand}
                autoStartMatching={shouldAutoStartMatching}
                contextQuery={volunteerContextQuery}
              />
            )}
            {currentPage === "events" && (
              <EventsPage
                onBack={goHome}
                onVoiceCommand={handleVoiceCommand}
              />
            )}
            {currentPage === "health" && (
              <HealthServicesPage
                onBack={goHome}
                onNavigate={navigateTo}
                onVoiceCommand={handleVoiceCommand}
              />
            )}
            {currentPage === "medication" && (
              <MedicationGuidePage
                onBack={goHome}
                onVoiceCommand={handleVoiceCommand}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneFrame: {
    width: "100%",
    maxWidth: 430,
    height: "100%",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
});