import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';

export default function CommunitiesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Explore Communities</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Community discovery and member management will be implemented in Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pageTitle: {
    ...theme.typography.title,
    color: theme.colors.ink,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
    textAlign: 'center',
  },
});
