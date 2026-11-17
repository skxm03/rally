import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkSubtle,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabelText, { color }]}>Home</Text>,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Explore',
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabelText, { color }]}>Explore</Text>,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabelText, { color }]}>Create</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabelText, { color }]}>Search</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabelText, { color }]}>Profile</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    elevation: 0,
    height: 56,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
