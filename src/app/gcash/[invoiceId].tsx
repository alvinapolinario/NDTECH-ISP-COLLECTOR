import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing } from '@/components/theme';
import { Badge, Button, Card, ErrorState, Field, LoadingState, Notice, Row } from '@/components/ui';
import { formatDateTime, formatPeso } from '@/lib/format';
import { useAccount, useCheckoutStatus, useCreateCheckout } from '@/lib/queries';
import type { OnlineCheckout } from '@/lib/types';

export default function GcashScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const id = Number(invoiceId);
  const account = useAccount(id);
  const createCheckout = useCreateCheckout();
  const [checkoutId, setCheckoutId] = useState<number | null>(null);
  const [amountText, setAmountText] = useState<string | null>(null);
  const status = useCheckoutStatus(checkoutId);

  if (account.isPending) return <LoadingState />;
  if (account.isError) return <ErrorState message={account.error.message} onRetry={() => account.refetch()} />;

  const data = account.data;
  const amountInput = amountText ?? data.balance.toFixed(2);
  const amount = Number(amountInput.replace(/,/g, ''));
  const checkout: OnlineCheckout | undefined = status.data ?? createCheckout.data;

  const start = async () => {
    const result = await createCheckout.mutateAsync({
      invoiceId: id,
      amount: amount > 0 && amount < data.balance ? amount : undefined,
    });
    setCheckoutId(result.id);
  };

  if (!checkout) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.name}>{data.customer.displayName}</Text>
          <Row label="Invoice" value={data.invoiceNumber} />
          <Row label="Balance" value={formatPeso(data.balance)} strong />
        </Card>
        <View style={styles.spacer} />
        <Field
          label="Amount to pay online"
          value={amountInput}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          hint="The customer scans a QR code and pays with GCash, Maya, or card. It is posted automatically."
        />
        {createCheckout.isError ? <Notice message={createCheckout.error.message} /> : null}
        <Button
          title="Show QR code"
          onPress={() => void start()}
          loading={createCheckout.isPending}
          disabled={!(amount >= 1) || amount > data.balance}
        />
      </ScrollView>
    );
  }

  const settled = checkout.status !== 'pending';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.center}>
        <Text style={styles.amount}>{formatPeso(checkout.amount)}</Text>
        <CheckoutBadge status={checkout.status} />
      </View>

      {checkout.status === 'pending' && checkout.checkoutUrl ? (
        <>
          <View style={styles.qr} accessibilityLabel="Payment QR code for the customer to scan">
            <QRCode value={checkout.checkoutUrl} size={240} />
          </View>
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.waitingText}>Waiting for the customer to pay…</Text>
          </View>
          {checkout.expiresAt ? (
            <Text style={styles.hint}>Link expires {formatDateTime(checkout.expiresAt)}</Text>
          ) : null}
          <Button
            title="Send link to customer"
            variant="secondary"
            onPress={() =>
              void Share.share({
                message: `NDTECH payment for ${data.invoiceNumber} (${formatPeso(checkout.amount)}): ${checkout.checkoutUrl}`,
              })
            }
            style={styles.spacer}
          />
        </>
      ) : null}

      {checkout.status === 'paid' ? (
        <Notice
          tone="success"
          message={`Payment received${checkout.payment ? ` — ${checkout.payment.paymentNumber}` : ''}. It is recorded as an online payment.`}
        />
      ) : null}
      {checkout.status === 'failed' || checkout.status === 'expired' || checkout.status === 'cancelled' ? (
        <Notice message={`The payment was ${checkout.status}. You can create a new QR code.`} />
      ) : null}
      {status.isError ? <Notice tone="warning" message="Can't check the payment status right now. Still trying…" /> : null}

      <View style={styles.actions}>
        {settled && checkout.status !== 'paid' ? (
          <Button
            title="New QR code"
            onPress={() => {
              setCheckoutId(null);
              createCheckout.reset();
            }}
          />
        ) : null}
        <Button title={settled ? 'Done' : 'Close (keep link active)'} variant="secondary" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

function CheckoutBadge({ status }: { status: OnlineCheckout['status'] }) {
  if (status === 'paid') return <Badge label="Paid" tone="success" />;
  if (status === 'pending') return <Badge label="Waiting for payment" tone="info" />;
  return <Badge label={status[0].toUpperCase() + status.slice(1)} tone="danger" />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  spacer: { marginTop: spacing.lg },
  center: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  amount: { fontSize: 32, fontWeight: '700', color: colors.text },
  qr: { alignSelf: 'center', padding: spacing.lg, backgroundColor: '#fff', borderRadius: 12 },
  waiting: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  waitingText: { color: colors.textMuted },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
