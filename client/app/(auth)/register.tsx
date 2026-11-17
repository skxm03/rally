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
import { useAuth } from '../../src/context/auth';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      setErrorMessage('Username, email, and password are required.');
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setErrorMessage('Username must be between 3 and 30 characters.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await register({
        username: cleanUsername,
        email: cleanEmail,
        displayName: displayName.trim() || undefined,
        password,
      });
      // Navigation handled by root layout on auth state change
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brandTitle}>Rally</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join communities and participate in discussions.</Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. alex"
                placeholderTextColor={theme.colors.inkSubtle}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="alex@example.com"
                placeholderTextColor={theme.colors.inkSubtle}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display name (optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Alex Carter"
                placeholderTextColor={theme.colors.inkSubtle}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Minimum 8 characters"
                placeholderTextColor={theme.colors.inkSubtle}
                editable={!isSubmitting}
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Button
              title="Create account"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onPress={handleSubmit}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.footerLink}>Sign in</Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.hero,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
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
    gap: theme.spacing.lg,
  },
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.captionMedium,
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
  button: {
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
  buttonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primaryContrast,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxl,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.inkSecondary,
  },
  footerLink: {
    ...theme.typography.captionMedium,
    color: theme.colors.ink,
    textDecorationLine: 'underline',
  },
});
