import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Button, Card, ErrorState, LoadingState, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { formatDate, formatPeso, PAYMENT_METHOD_LABELS } from '@/lib/format';
import { useCashOnHand, useDashboard } from '@/lib/queries';
import type { PaymentMethod } from '@/lib/types';

export default function TodayScreen() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const cash = useCashOnHand();

  if (dashboard.isPending) return <LoadingState />;
  if (dashboard.isError) {
    return <ErrorState message={dashboard.error.message} onRetry={() => dashboard.refetch()} />;
  }

  const data = dashboard.data;
  const methods = Object.entries(data.collected.byMethod) as [PaymentMethod, number][];
  const refreshing = dashboard.isRefetching || cash.isRefetching;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            dashboard.refetch();
            cash.refetch();
          }}
        />
      }
    >
      <Text style={styles.greeting}>Hi, {user?.name.split(' ')[0]}</Text>
      <Text style={styles.date}>{formatDate(data.date)}</Text>

      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Collected today</Text>
        <Text style={styles.heroValue}>{formatPeso(data.collected.total)}</Text>
        <Text style={styles.heroMeta}>
          {data.collected.count} payment{data.collected.count === 1 ? '' : 's'} · {data.visitCount} visit
          {data.visitCount === 1 ? '' : 's'}
        </Text>
      </Card>

      {methods.length ? (
        <>
          <SectionTitle>By method</SectionTitle>
          <Card>
            {methods.map(([method, amount]) => (
              <Row key={method} label={PAYMENT_METHOD_LABELS[method]} value={formatPeso(amount)} />
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>Cash to remit</SectionTitle>
      <Card>
        <Row label="Cash on hand" value={formatPeso(cash.data?.amount ?? data.cashOnHand)} strong />
        <Row label="Cash payments" value={String(cash.data?.paymentCount ?? '—')} />
        <Row
          label="Last remittance"
          value={cash.data?.lastRemittance ? formatDate(cash.data.lastRemittance.remittanceDate) : 'None yet'}
        />
      </Card>

      <SectionTitle>Assigned to me</SectionTitle>
      <Card>
        <Row label="Open accounts" value={String(data.assigned.openInvoiceCount)} />
        <Row label="Total balance" value={formatPeso(data.assigned.openBalance)} strong />
      </Card>

      <View style={styles.actions}>
        <Button title="Find an account" onPress={() => router.navigate('/accounts')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  date: { color: colors.textMuted, marginBottom: spacing.lg },
  hero: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroLabel: { color: colors.primarySoft },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '700', marginVertical: spacing.xs },
  heroMeta: { color: colors.primarySoft },
  actions: { marginTop: spacing.xl },
});
