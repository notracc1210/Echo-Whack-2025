import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { FamilyHomePage } from './components/pages/family/FamilyHomePage';
import { FamilyConnectionPage } from './components/pages/family/FamilyConnectionPage';
import { FamilyMedicationPage } from './components/pages/family/FamilyMedicationPage';
import { FamilyActivityPage } from './components/pages/family/FamilyActivityPage';
import { FamilyEmergencyPage } from './components/pages/family/FamilyEmergencyPage';
import { FamilyVolunteerPage } from './components/pages/family/FamilyVolunteerPage';

export type FamilyPage =
  | 'home'
  | 'connection'
  | 'medication'
  | 'activity'
  | 'emergency'
  | 'volunteer';

interface FamilyAppProps {
  userId: string;
  userName: string;
  onLogout: () => void;
}

export function FamilyApp({ userId, userName, onLogout }: FamilyAppProps) {
  const [currentPage, setCurrentPage] = useState<FamilyPage>('home');

  const navigateTo = (page: FamilyPage) => {
    setCurrentPage(page);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.phoneFrame}>
          <View style={styles.content}>
            {currentPage === 'home' && (
              <FamilyHomePage
                userId={userId}
                userName={userName}
                onNavigate={navigateTo}
                onLogout={onLogout}
              />
            )}
            {currentPage === 'connection' && (
              <FamilyConnectionPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'medication' && (
              <FamilyMedicationPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'activity' && (
              <FamilyActivityPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'emergency' && (
              <FamilyEmergencyPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'volunteer' && (
              <FamilyVolunteerPage
                userId={userId}
                onBack={() => navigateTo('home')}
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
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 430,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});








