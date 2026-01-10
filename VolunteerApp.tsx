import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { VolunteerHomePage } from './components/pages/volunteer/VolunteerHomePage';
import { VolunteerRequestsPage } from './components/pages/volunteer/VolunteerRequestsPage';
import { VolunteerSchedulePage } from './components/pages/volunteer/VolunteerSchedulePage';
import { VolunteerMatchesPage } from './components/pages/volunteer/VolunteerMatchesPage';
import { VolunteerProfilePage } from './components/pages/volunteer/VolunteerProfilePage';
import { VolunteerHistoryPage } from './components/pages/volunteer/VolunteerHistoryPage';

export type VolunteerPage =
  | 'home'
  | 'requests'
  | 'schedule'
  | 'matches'
  | 'profile'
  | 'history';

interface VolunteerAppProps {
  userId: string;
  userName: string;
  onLogout: () => void;
}

export function VolunteerApp({ userId, userName, onLogout }: VolunteerAppProps) {
  const [currentPage, setCurrentPage] = useState<VolunteerPage>('home');

  const navigateTo = (page: VolunteerPage) => {
    setCurrentPage(page);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.phoneFrame}>
          <View style={styles.content}>
            {currentPage === 'home' && (
              <VolunteerHomePage
                userId={userId}
                userName={userName}
                onNavigate={navigateTo}
                onLogout={onLogout}
              />
            )}
            {currentPage === 'requests' && (
              <VolunteerRequestsPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'schedule' && (
              <VolunteerSchedulePage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'matches' && (
              <VolunteerMatchesPage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'profile' && (
              <VolunteerProfilePage
                userId={userId}
                onBack={() => navigateTo('home')}
              />
            )}
            {currentPage === 'history' && (
              <VolunteerHistoryPage
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








