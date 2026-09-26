import { Link, router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Badge, Button, Card, ErrorState, LoadingState, Row, SectionTitle } from '@/components/ui';
import {
  CASE_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatPeso,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/format';
import { useAccount } from '@/lib/queries';

export default function AccountScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const id = Number(invoiceId);
  const account = useAccount(id);

  if (account.isPending) return <LoadingState />;
  if (account.isError) return <ErrorState message={account.error.message} onRetry={() => account.refetch()} />;

  const data = account.data;
  const payable = data.balance > 0 && ['issued', 'partially_paid', 'overdue'].includes(data.status);
  const address = data.address;
  const addressLine = address
    ? [address.street, address.barangay, address.municipality, address.province].filter(Boolean).join(', ')
    : null;

  const openMap = () => {
    if (!address) return;
    const destination =
      address.latitude !== null && address.longitude !== null
        ? `${address.latitude},${address.longitude}`
        : encodeURIComponent(addressLine ?? '');
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={account.isRefetching} onRefresh={() => account.refetch()} />}
    >
      <Text style={styles.name}>{data.customer.displayName}</Text>
      <Text style={styles.meta}>
        {data.customer.accountNumber} · {data.subscription?.servicePlanName ?? 'No active plan'}
      </Text>

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Balance due</Text>
        <Text style={styles.balance}>{formatPeso(data.balance)}</Text>
        <View style={styles.badges}>
          <Badge label={INVOICE_STATUS_LABELS[data.status]} tone={data.status === 'paid' ? 'success' : 'neutral'} />
          {data.daysOverdue > 0 ? <Badge label={`${data.daysOverdue} days overdue`} tone="danger" /> : null}
          {data.subscription?.status === 'suspended' ? <Badge label="Service suspended" tone="warning" /> : null}
        </View>
      </Card>

      {payable ? (
        <View style={styles.actions}>
          <Button
            title="Collect payment"
            onPress={() => router.push({ pathname: '/collect/[invoiceId]', params: { invoiceId: data.invoiceId } })}
          />
          <View style={styles.actionRow}>
            <Button
              title="GCash QR"
              variant="secondary"
              style={styles.flex}
              onPress={() => router.push({ pathname: '/gcash/[invoiceId]', params: { invoiceId: data.invoiceId } })}
            />
            <Button
              title="Log visit"
              variant="secondary"
              style={styles.flex}
              onPress={() => router.push({ pathname: '/visit/[invoiceId]', params: { invoiceId: data.invoiceId } })}
            />
          </View>
        </View>
      ) : null}

      <SectionTitle>Customer</SectionTitle>
      <Card>
        <Row label="Mobile" value={data.customer.mobileNumber} />
        <Row label="Address" value={addressLine ?? '—'} />
        <View style={styles.actionRow}>
          <Button
            title="Call"
            variant="secondary"
            style={styles.flex}
            onPress={() => void Linking.openURL(`tel:${data.customer.mobileNumber}`)}
          />
          <Button title="Map" variant="secondary" style={styles.flex} disabled={!address} onPress={openMap} />
        </View>
      </Card>

      <SectionTitle>Invoice {data.invoiceNumber}</SectionTitle>
      <Card>
        <Row label="Billing period" value={data.billingCycleName} />
        <Row label="Due date" value={formatDate(data.dueDate)} />
        {data.items.map((item) => (
          <Row key={item.id} label={item.description} value={formatPeso(item.amount)} />
        ))}
        <Row label="Total" value={formatPeso(data.total)} />
        <Row label="Paid" value={formatPeso(data.amountPaid)} />
        <Row label="Balance" value={formatPeso(data.balance)} strong />
      </Card>

      {data.otherOpenInvoices.length ? (
        <>
          <SectionTitle>Other unpaid months</SectionTitle>
          <Card>
            {data.otherOpenInvoices.map((other) => (
              <Link
                key={other.invoiceId}
                href={{ pathname: '/account/[invoiceId]', params: { invoiceId: other.invoiceId } }}
                asChild
              >
                <Pressable style={styles.linkRow}>
                  <Text style={styles.linkText}>
                    {other.invoiceNumber} · due {formatDate(other.dueDate)}
                  </Text>
                  <Text style={styles.linkAmount}>{formatPeso(other.balance)}</Text>
                </Pressable>
              </Link>
            ))}
          </Card>
        </>
      ) : null}

      {data.collectionCase ? (
        <>
          <SectionTitle>Collection status</SectionTitle>
          <Card>
            <Row label="Status" value={CASE_STATUS_LABELS[data.collectionCase.status]} />
            {data.collectionCase.promiseToPayDate ? (
              <Row label="Promised to pay" value={formatDate(data.collectionCase.promiseToPayDate)} />
            ) : null}
            {data.collectionCase.nextFollowUpDate ? (
              <Row label="Next follow-up" value={formatDate(data.collectionCase.nextFollowUpDate)} />
            ) : null}
            <Row label="Last contact" value={formatDateTime(data.collectionCase.lastContactedAt)} />
            {data.collectionCase.notes ? <Text style={styles.notes}>{data.collectionCase.notes}</Text> : null}
          </Card>
        </>
      ) : null}

      {data.recentPayments.length ? (
        <>
          <SectionTitle>Recent payments</SectionTitle>
          <Card>
            {data.recentPayments.map((payment) => (
              <Row
                key={payment.id}
                label={`${formatDate(payment.paymentDate)} · ${PAYMENT_METHOD_LABELS[payment.paymentMethod]}`}
                value={formatPeso(payment.amount)}
              />
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginBottom: spacing.md },
  balanceCard: { alignItems: 'flex-start' },
  balanceLabel: { color: colors.textMuted },
  balance: { fontSize: 32, fontWeight: '700', color: colors.text, marginVertical: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  linkText: { color: colors.primary, flexShrink: 1 },
  linkAmount: { fontWeight: '600', color: colors.text },
  notes: { color: colors.textMuted, marginTop: spacing.sm },
});
