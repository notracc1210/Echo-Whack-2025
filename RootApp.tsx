import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginPage } from './components/pages/LoginPage';
import App from './App';
import { VolunteerApp } from './VolunteerApp';
import { FamilyApp } from './FamilyApp';
import { ManagerApp } from './ManagerApp';

export default function RootApp() {
  const [user, setUser] = useState<{ userId: string; role: string; name: string } | null>(null);

  const handleLogin = (userId: string, role: string, name: string) => {
    setUser({ userId, role, name });
  };

  const handleLogout = () => {
    console.log('RootApp: handleLogout called, setting user to null');
    setUser(null);
  };

  // Show older adult app directly when not authenticated (no login required)
  if (!user) {
    return <App onLogout={handleLogout} />;
  }

  // Route to appropriate app based on role
  if (user.role === 'volunteer') {
    return <VolunteerApp userId={user.userId} userName={user.name} onLogout={handleLogout} />;
  }

  if (user.role === 'family') {
    return <FamilyApp userId={user.userId} userName={user.name} onLogout={handleLogout} />;
  }

  // Route manager to the separate Manager app
  if (user.role === 'manager') {
    return <ManagerApp userId={user.userId} userName={user.name} onLogout={handleLogout} />;
  }

  // Default to older adult app (existing App.tsx)
  console.log('RootApp: Rendering App component with onLogout:', typeof handleLogout);
  return <App onLogout={handleLogout} />;
}



