import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...input} />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';
const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.border, fg: colors.text },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  success: { bg: colors.successSoft, fg: colors.success },
  info: { bg: colors.primarySoft, fg: colors.primary },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const tint = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tint.bg }]}>
      <Text style={[styles.badgeText, { color: tint.fg }]}>{label}</Text>
    </View>
  );
}

export function Notice({ message, tone = 'danger' }: { message: string; tone?: Tone }) {
  const tint = toneColors[tone];
  return (
    <View style={[styles.notice, { backgroundColor: tint.bg }]} accessibilityRole="alert">
      <Text style={{ color: tint.fg }}>{message}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateText}>{message}</Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} style={styles.stateButton} />
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, gap: spacing.md },
  rowLabel: { color: colors.textMuted, flexShrink: 0 },
  rowValue: { color: colors.text, flexShrink: 1, textAlign: 'right' },
  rowValueStrong: { fontWeight: '700' },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  buttonTextSecondary: { color: colors.primary },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  fieldHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { fontSize: 12, fontWeight: '600' },
  notice: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  stateText: { color: colors.textMuted, textAlign: 'center', fontSize: 15 },
  stateButton: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
