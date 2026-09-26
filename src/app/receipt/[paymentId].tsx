import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Badge, Button, Card, ErrorState, LoadingState, Notice, Row } from '@/components/ui';
import { formatDate, formatDateTime, formatPeso, PAYMENT_METHOD_LABELS } from '@/lib/format';
import { usePayment } from '@/lib/queries';
import type { Payment } from '@/lib/types';

function receiptText(payment: Payment) {
  return [
    'NDTECH — Payment acknowledgement',
    `Payment no.: ${payment.paymentNumber}`,
    `Date: ${formatDate(payment.paymentDate)}`,
    `Customer: ${payment.customer.displayName} (${payment.customer.accountNumber})`,
    `Invoice: ${payment.invoice.invoiceNumber} · ${payment.invoice.billingCycleName}`,
    `Amount: ${formatPeso(payment.amount)} via ${PAYMENT_METHOD_LABELS[payment.paymentMethod]}`,
    payment.referenceNumber ? `Reference: ${payment.referenceNumber}` : null,
    `Remaining balance: ${formatPeso(payment.invoice.remainingBalance)}`,
    `Received by: ${payment.receivedBy ?? '—'}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function ReceiptScreen() {
  const { paymentId, notice } = useLocalSearchParams<{ paymentId: string; notice?: string }>();
  const payment = usePayment(Number(paymentId));

  if (payment.isPending) return <LoadingState />;
  if (payment.isError) return <ErrorState message={payment.error.message} onRetry={() => payment.refetch()} />;

  const data = payment.data;
  const settled = data.invoice.remainingBalance <= 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {notice ? <Notice message={notice} tone="warning" /> : null}

      <View style={styles.header}>
        <Text style={styles.amount}>{formatPeso(data.amount)}</Text>
        <Badge
          label={data.status === 'voided' ? 'Voided' : settled ? 'Invoice fully paid' : 'Posted'}
          tone={data.status === 'voided' ? 'danger' : 'success'}
        />
      </View>

      <Card>
        <Row label="Payment no." value={data.paymentNumber} strong />
        <Row label="Customer" value={data.customer.displayName} />
        <Row label="Account no." value={data.customer.accountNumber} />
        <Row label="Invoice" value={data.invoice.invoiceNumber} />
        <Row label="Period" value={data.invoice.billingCycleName} />
        <Row label="Method" value={PAYMENT_METHOD_LABELS[data.paymentMethod]} />
        {data.referenceNumber ? <Row label="Reference" value={data.referenceNumber} /> : null}
        <Row label="Payment date" value={formatDate(data.paymentDate)} />
        <Row label="Recorded" value={formatDateTime(data.createdAt)} />
        <Row label="Received by" value={data.receivedBy ?? '—'} />
        <Row label="Remaining balance" value={formatPeso(data.invoice.remainingBalance)} strong />
      </Card>

      {settled && data.status === 'posted' ? (
        <Text style={styles.hint}>
          If the customer&apos;s internet was suspended, it is being reconnected automatically.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button title="Share receipt" variant="secondary" onPress={() => void Share.share({ message: receiptText(data) })} />
        <Button title="Done" onPress={() => (router.canDismiss() ? router.dismissAll() : router.replace('/'))} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { alignItems: 'center', marginVertical: spacing.lg, gap: spacing.sm },
  amount: { fontSize: 36, fontWeight: '700', color: colors.text },
  hint: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
