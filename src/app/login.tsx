import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/components/theme';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL, isApiConfigured } from '@/lib/config';

type IconName = ComponentProps<typeof Ionicons>['name'];

function serverLabel() {
  try {
    return new URL(API_BASE_URL).host;
  } catch {
    return API_BASE_URL;
  }
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
          : caught instanceof ApiError && caught.status === 401
            ? 'Incorrect email or password.'
            : caught instanceof Error
              ? caught.message
              : 'Sign in failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.hero, { paddingTop: insets.top + spacing.xl * 1.5 }]}>
            <View style={[styles.orb, styles.orbLarge]} />
            <View style={[styles.orb, styles.orbSmall]} />

            <View style={styles.logoTile}>
              <Image
                source={require('../../assets/ndtech-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                accessibilityLabel="NDTECH logo"
              />
            </View>
            <Text style={styles.brand}>NDTECH</Text>
            <Text style={styles.product}>Collector</Text>
            <Text style={styles.tagline}>Collect payments and log visits in the field</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use the collector account given by the office.</Text>

            {!isApiConfigured ? (
              <Banner icon="construct-outline" message="EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and restart Expo." />
            ) : null}
            {error ? <Banner icon="alert-circle-outline" message={error} /> : null}

            <IconInput
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="you@ndtech.ph"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <IconInput
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              trailing={
                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
                </Pressable>
              }
            />

            <Button
              title="Sign in"
              onPress={submit}
              loading={submitting}
              disabled={!isApiConfigured}
              style={styles.submit}
            />

            <View style={styles.help}>
              <Ionicons name="help-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.helpText}>Forgot password? Ask the office to reset it.</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              <Ionicons
                name={isApiConfigured ? 'server-outline' : 'warning-outline'}
                size={12}
                color={isApiConfigured ? colors.textMuted : colors.danger}
              />
              <Text style={styles.footerText}>{isApiConfigured ? serverLabel() : 'No server configured'}</Text>
            </View>
            <Text style={styles.footerText}>Version {Constants.expoConfig?.version ?? '—'}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Banner({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={20} color={colors.danger} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

type IconInputProps = TextInputProps & {
  label: string;
  icon: IconName;
  trailing?: ReactNode;
  ref?: Ref<TextInput>;
};

function IconInput({ label, icon, trailing, ref, ...input }: IconInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} />
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            input.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            input.onBlur?.(event);
          }}
          {...input}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingBottom: spacing.xl * 3.5,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  orbLarge: { width: 320, height: 320, top: -140, right: -110 },
  orbSmall: { width: 180, height: 180, bottom: -70, left: -60, backgroundColor: 'rgba(0,0,0,0.08)' },
  logoTile: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logo: { width: 60, height: 60 },
  brand: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 3 },
  product: {
    color: colors.primarySoft,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tagline: { color: 'rgba(255,255,255,0.8)', marginTop: spacing.md, textAlign: 'center', fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl * 2.5,
    borderRadius: 20,
    padding: spacing.xl,
    shadowColor: '#1F1147',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, fontSize: 14 },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, color: colors.danger, lineHeight: 20 },
  field: { marginBottom: spacing.lg },
  label: { fontWeight: '600', color: colors.text, marginBottom: spacing.sm, fontSize: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FAFAFB',
    paddingHorizontal: spacing.md,
  },
  inputWrapFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.md },
  submit: { marginTop: spacing.sm, minHeight: 52, borderRadius: radius.md },
  help: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  helpText: { color: colors.textMuted, fontSize: 13, flexShrink: 1, textAlign: 'center' },
  footer: { alignItems: 'center', gap: spacing.xs, marginTop: 'auto', paddingTop: spacing.xl },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
