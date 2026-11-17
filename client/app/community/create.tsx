import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { communityApi } from '../../src/api/communities';
import { theme } from '../../src/theme';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cleanName = name.trim().toLowerCase();
    const nameRegex = /^[a-z0-9_]{3,30}$/;

    if (!cleanName) {
      setErrorMessage('Please enter a community name.');
      return;
    }

    if (!nameRegex.test(cleanName)) {
      setErrorMessage('Name must be 3-30 alphanumeric characters or underscores.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const community = await communityApi.createCommunity({
        name: cleanName,
        description: description.trim() || undefined,
      });

      // Replace current screen with the newly created community
      router.replace(`/community/${community.name}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not create community.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={isSubmitting}
        >
          <Feather name="arrow-left" size={20} color={theme.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>New Community</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create a Community</Text>
            <Text style={styles.subtitle}>
              Build a focused space for discussions, links, and ideas.
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Community Name</Text>
              <View style={styles.prefixInputContainer}>
                <Text style={styles.prefixText}>c/</Text>
                <TextInput
                  style={styles.prefixInput}
                  value={name}
                  onChangeText={(text) => {
                    setName(text.toLowerCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="technology"
                  placeholderTextColor={theme.colors.inkSubtle}
                  editable={!isSubmitting}
                  maxLength={30}
                />
              </View>
              <Text style={styles.hintText}>
                3-30 letters, numbers, or underscores. Cannot be changed later.
              </Text>
            </View>

            {/* Description Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What is this community about?"
                placeholderTextColor={theme.colors.inkSubtle}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
                maxLength={1000}
              />
              <Text style={styles.hintText}>Up to 1000 characters.</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
              ) : (
                <Text style={styles.submitButtonText}>Create community</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  navTitle: {
    ...theme.typography.title,
    fontSize: 16,
    color: theme.colors.ink,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.hero,
    fontSize: 24,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.subtitle,
    color: theme.colors.inkSecondary,
  },
  errorBox: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.errorBorder,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  form: {
    gap: theme.spacing.xl,
  },
  field: {
    gap: 6,
  },
  label: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
  },
  hintText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.inkSubtle,
  },
  prefixInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
  },
  prefixText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.inkSecondary,
    marginRight: 2,
  },
  prefixInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.ink,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.ink,
  },
  textArea: {
    minHeight: 110,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryContrast,
  },
});
