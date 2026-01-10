import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManagerEventsPage } from './components/pages/ManagerEventsPage';
import { ManagerUsersPage } from './components/pages/ManagerUsersPage';
import { ManagerCreateEventPage } from './components/pages/ManagerCreateEventPage';
import { MaterialIcons } from '@expo/vector-icons';

interface ManagerAppProps {
  userId: string;
  userName: string;
  onLogout: () => void;
}

export function ManagerApp({ userId, userName, onLogout }: ManagerAppProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'users'>('events');

  return (
    <SafeAreaProvider>
      <ManagerAppContent 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
      />
    </SafeAreaProvider>
  );
}

function ManagerAppContent({ activeTab, setActiveTab, onLogout }: { 
  activeTab: 'events' | 'users', 
  setActiveTab: (tab: 'events' | 'users') => void,
  onLogout: () => void 
}) {
  const insets = useSafeAreaInsets();
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const renderContent = () => {
    if (activeTab === 'events') {
      if (isCreatingEvent) {
        return <ManagerCreateEventPage onBack={() => setIsCreatingEvent(false)} />;
      }
      return <ManagerEventsPage onCreateEvent={() => setIsCreatingEvent(true)} />;
    }
    return <ManagerUsersPage />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.phoneFrame}>
        {!isCreatingEvent && (
          <View style={styles.header}>
            <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={24} color="#6b7280" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Manager Portal</Text>
            <View style={{ width: 80 }} />
          </View>
        )}
        
        <View style={styles.content}>
          {renderContent()}
        </View>
        
        {!isCreatingEvent && (
          <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]} 
              onPress={() => setActiveTab('events')}
            >
              <MaterialIcons 
                name="event" 
                size={24} 
                color={activeTab === 'events' ? '#2563eb' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
                Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'users' && styles.tabItemActive]} 
              onPress={() => setActiveTab('users')}
            >
              <MaterialIcons 
                name="people" 
                size={24} 
                color={activeTab === 'users' ? '#2563eb' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                Users
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
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
    display: 'flex',
    flexDirection: 'column',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-between',
  },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  logoutText: { color: '#6b7280', fontSize: 16, marginLeft: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    // Optional active background style
  },
  tabText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
