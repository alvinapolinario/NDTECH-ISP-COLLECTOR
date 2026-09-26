import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import { formatDate, formatPeso } from '@/lib/format';
import { useCashOnHand, useProfile } from '@/lib/queries';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const profile = useProfile();
  const cash = useCashOnHand();

  const confirmSignOut = () => {
    const cashAmount = cash.data?.amount ?? 0;
    Alert.alert(
      'Sign out?',
      cashAmount > 0
        ? `You still have ${formatPeso(cashAmount)} cash on hand. Remit it to the office as usual.`
        : 'You will need your email and password to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.name}>{profile.data?.name ?? user?.name}</Text>
      <Text style={styles.email}>{profile.data?.email ?? user?.email}</Text>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <Row label="Mobile" value={profile.data?.mobileNumber ?? '—'} />
        <Row label="Role" value={profile.data?.roles.join(', ') ?? 'Collector'} />
      </Card>

      <SectionTitle>Cash</SectionTitle>
      <Card>
        <Row label="Cash on hand" value={cash.data ? formatPeso(cash.data.amount) : '—'} strong />
        <Row label="Counting from" value={cash.data?.since ? formatDate(cash.data.since) : 'All time'} />
      </Card>
      <Button title="View remittances" variant="secondary" onPress={() => router.push('/remittances')} style={styles.gap} />

      <SectionTitle>App</SectionTitle>
      <Card>
        <Row label="Version" value={Constants.expoConfig?.version ?? '—'} />
        <Row label="Server" value={API_BASE_URL || 'Not configured'} />
      </Card>

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} style={styles.signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted },
  gap: { marginTop: spacing.md },
  signOut: { marginTop: spacing.xl },
});
