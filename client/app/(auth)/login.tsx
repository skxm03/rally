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
import { theme } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your username/email and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ identifier: identifier.trim(), password });
      // Successful login automatically triggers navigation via root layout
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password.');
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
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Enter your details to access your communities.</Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Username or email</Text>
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="alice or alice@example.com"
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
                placeholder="••••••••"
                placeholderTextColor={theme.colors.inkSubtle}
                editable={!isSubmitting}
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.primaryContrast} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Need an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              disabled={isSubmitting}
            >
              <Text style={styles.footerLink}>Create account</Text>
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
    paddingTop: theme.spacing.xxl,
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
