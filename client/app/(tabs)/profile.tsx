import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/auth';
import { userApi } from '../../src/api/users';
import { theme } from '../../src/theme';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  const openEditModal = () => {
    setEditDisplayName(user?.displayName || '');
    setEditBio(user?.bio || '');
    setEditErrorMessage(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    const cleanDisplayName = editDisplayName.trim();
    if (cleanDisplayName.length > 100) {
      setEditErrorMessage('Display name must not exceed 100 characters.');
      return;
    }

    const cleanBio = editBio.trim();
    if (cleanBio.length > 500) {
      setEditErrorMessage('Bio must not exceed 500 characters.');
      return;
    }

    setIsSavingProfile(true);
    setEditErrorMessage(null);

    try {
      await userApi.updateProfile({
        displayName: cleanDisplayName || null,
        bio: cleanBio || null,
      });

      await refreshUser();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Rally?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch (err: any) {
            Alert.alert('Sign out error', err.message || 'Failed to sign out.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
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
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={openEditModal}
          activeOpacity={0.7}
        >
          <Feather name="edit" size={14} color={theme.colors.ink} style={{ marginRight: 4 }} />
          <Text style={styles.editProfileButtonText}>Edit</Text>
        </TouchableOpacity>
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
            <Text style={styles.detailLabel}>Account ID</Text>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                disabled={isSavingProfile}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
                style={styles.modalSave}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={theme.colors.ink} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {editErrorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{editErrorMessage}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Your display name"
                  placeholderTextColor={theme.colors.inkSubtle}
                  maxLength={100}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldTextArea]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Write a brief bio..."
                  placeholderTextColor={theme.colors.inkSubtle}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.fieldHint}>Up to 500 characters.</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  editProfileButtonText: {
    ...theme.typography.captionMedium,
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
    lineHeight: 21,
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  modalCancel: {
    paddingVertical: 4,
  },
  modalCancelText: {
    ...theme.typography.body,
    color: theme.colors.inkSecondary,
  },
  modalSave: {
    paddingVertical: 4,
  },
  modalSaveText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.ink,
    fontWeight: '600',
  },
  modalBody: {
    padding: theme.spacing.xl,
  },
  errorBox: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.errorBorder,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  field: {
    marginBottom: theme.spacing.xl,
  },
  fieldLabel: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
  },
  fieldTextArea: {
    minHeight: 100,
  },
  fieldHint: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.inkSubtle,
    marginTop: 4,
  },
});
