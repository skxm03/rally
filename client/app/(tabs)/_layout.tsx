import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../src/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Account for bottom safe area on devices with gesture navigation or home bars.
  // We allocate 54px for tab icons & labels, and add insets.bottom cleanly.
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabBarHeight = 54 + bottomPadding;

  const getIconColor = (color: unknown): string => {
    return typeof color === 'string' ? color : theme.colors.ink;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
        ],
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkSubtle,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={20} color={getIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={20} color={getIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => (
            <Feather name="plus-square" size={20} color={getIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={20} color={getIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={20} color={getIconColor(color)} />
          ),
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
  },
  tabBarItem: {
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
