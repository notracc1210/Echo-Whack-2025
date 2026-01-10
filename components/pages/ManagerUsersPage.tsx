import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchWithTimeout } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface User {
  id: string;
  name: string;
  role: string;
  createdAt?: string;
}

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export function ManagerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('older-adult'); // Default role
  const [creating, setCreating] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const insets = useSafeAreaInsets();

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users`);
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        Alert.alert('Error', 'Failed to fetch users');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUserId || !newUserName) {
      Alert.alert('Error', 'Please fill in User ID and Name');
      return;
    }

    setCreating(true);
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
      
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newUserId,
          name: newUserName,
          role: newUserRole
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'User created successfully');
        setNewUserId('');
        setNewUserName('');
        setNewUserRole('older-adult');
        fetchUsers(); // Refresh list
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create user');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete user ${userId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.0.18:3001';
              const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                fetchUsers(); // Refresh list
              } else {
                Alert.alert('Error', 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'Could not connect to server');
            }
          }
        }
      ]
    );
  };

  const roles = [
    { label: 'Older Adult', value: 'older-adult' },
    { label: 'Volunteer', value: 'volunteer' },
    { label: 'Family Member', value: 'family' },
    { label: 'Manager', value: 'manager' }
  ];

  const filterRoles = [
    { label: 'All', value: 'all' },
    ...roles
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      case 'oldest':
        return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime());
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Name (A-Z)', value: 'name-asc' },
    { label: 'Name (Z-A)', value: 'name-desc' },
  ];

  return (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.subtitle}>Create New User</Text>
      <View style={styles.form}>
        <Text style={styles.label}>User ID</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., ADULT005"
          value={newUserId}
          onChangeText={setNewUserId}
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Full Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., John Doe"
          value={newUserName}
          onChangeText={setNewUserName}
        />
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.roleButton,
                newUserRole === role.value && styles.roleButtonActive
              ]}
              onPress={() => setNewUserRole(role.value)}
            >
              <Text style={[
                styles.roleButtonText,
                newUserRole === role.value && styles.roleButtonTextActive
              ]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleCreateUser}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create User</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text style={[styles.subtitle, { marginTop: 30 }]}>Current Users</Text>
      
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
            <View style={styles.sortOptionsContainer}>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortChip,
                    sortBy === option.value && styles.sortChipActive
                  ]}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={[
                    styles.sortChipText,
                    sortBy === option.value && styles.sortChipTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilterScroll}>
          <View style={styles.roleFilterContainer}>
            {filterRoles.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.filterChip,
                  filterRole === role.value && styles.filterChipActive
                ]}
                onPress={() => setFilterRole(role.value)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterRole === role.value && styles.filterChipTextActive
                ]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.list}>
          {filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={styles.userDetails}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{user.role}</Text>
                  </View>
                  <Text style={styles.userId}>ID: {user.id}</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => handleDeleteUser(user.id)}
                style={styles.deleteButton}
              >
                <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {filteredUsers.length === 0 && (
            <Text style={styles.emptyText}>
              {users.length === 0 ? 'No users found' : 'No users match your search'}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  subtitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 15 },
  form: { gap: 15, backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6'
  },
  roleButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  roleButtonText: { color: '#374151', fontSize: 14 },
  roleButtonTextActive: { color: '#ffffff', fontWeight: '600' },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  list: { gap: 12 },
  filterContainer: { marginBottom: 15, gap: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  sortContainer: {
    marginTop: 4,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  sortScroll: {
    marginHorizontal: -20,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  sortChipText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  sortChipTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  roleFilterScroll: { marginHorizontal: -20 },
  roleFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  userCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  userDetails: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userId: { fontSize: 14, color: '#6b7280' },
  badge: { 
    backgroundColor: '#eff6ff', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  badgeText: { fontSize: 12, color: '#2563eb', fontWeight: '500', textTransform: 'capitalize' },
  deleteButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 20, fontSize: 16 }
});
