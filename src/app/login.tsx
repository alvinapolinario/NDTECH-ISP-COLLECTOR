import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/components/theme';
import { Button, Field, Notice } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isApiConfigured } from '@/lib/config';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 403
          ? 'This account is not a collector. Ask the office to give you the Collector role.'
          : caught instanceof Error
            ? caught.message
            : 'Sign in failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.title}>NDTECH Collector</Text>
            <Text style={styles.subtitle}>Sign in with your collector account</Text>
          </View>

          {!isApiConfigured ? (
            <Notice message="EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and restart Expo." />
          ) : null}
          {error ? <Notice message={error} /> : null}

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button title="Sign in" onPress={submit} loading={submitting} disabled={!isApiConfigured} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  subtitle: { color: colors.textMuted, marginTop: spacing.xs, fontSize: 15 },
});
