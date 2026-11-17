import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/auth';
import { theme } from '../../src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err: any) {
      Alert.alert('Sign out error', err.message || 'Failed to sign out.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <Text style={styles.displayName}>
            {user?.displayName || user?.username || 'User'}
          </Text>
          <Text style={styles.username}>@{user?.username}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Karma</Text>
            <Text style={styles.statValue}>{user?.karma ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Member since</Text>
            <Text style={styles.statValueSmall}>{formattedDate || 'Recent'}</Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue}>#{user?.id}</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.8}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Text style={styles.logoutButtonText}>Sign out</Text>
            )}
          </TouchableOpacity>
        </View>
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
  },
  profileSection: {
    marginBottom: theme.spacing.xl,
  },
  displayName: {
    ...theme.typography.hero,
    fontSize: 24,
    color: theme.colors.ink,
  },
  username: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginTop: 2,
  },
  bio: {
    ...theme.typography.body,
    color: theme.colors.ink,
    marginTop: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.title,
    color: theme.colors.ink,
  },
  statValueSmall: {
    ...theme.typography.bodyMedium,
    color: theme.colors.ink,
  },
  detailsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  detailLabel: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
  },
  detailValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.ink,
  },
  actionContainer: {
    marginTop: 'auto',
    paddingBottom: theme.spacing.lg,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  logoutButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.error,
  },
});
