import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Button, Card, Chip, ErrorState, Field, LoadingState, Notice, Row } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { newRequestId } from '@/lib/device';
import { formatPeso, PAYMENT_METHOD_LABELS } from '@/lib/format';
import { useAccount, useCreatePayment } from '@/lib/queries';
import type { PaymentMethod } from '@/lib/types';

const METHODS: PaymentMethod[] = ['cash', 'gcash', 'bank_transfer', 'check', 'other'];

const REFERENCE_LABELS: Partial<Record<PaymentMethod, string>> = {
  gcash: 'GCash reference no.',
  bank_transfer: 'Bank reference no.',
  check: 'Check no.',
  other: 'Reference no.',
};

function parseAmount(text: string) {
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
}

export default function CollectScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const id = Number(invoiceId);
  const account = useAccount(id);
  const createPayment = useCreatePayment();

  // One requestId per payment attempt. It survives retries so a timed-out
  // request can be re-sent without ever recording the payment twice.
  const requestId = useRef(newRequestId());

  const [amountText, setAmountText] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<{ message: string; retrySafe: boolean } | null>(null);

  if (account.isPending) return <LoadingState />;
  if (account.isError) return <ErrorState message={account.error.message} onRetry={() => account.refetch()} />;

  const data = account.data;
  const balance = data.balance;
  const amountInput = amountText ?? balance.toFixed(2);
  const amount = parseAmount(amountInput);
  const needsReference = method !== 'cash';

  const validationError =
    !(amount > 0)
      ? 'Enter the amount received.'
      : amount > balance
        ? `Amount is more than the balance of ${formatPeso(balance)}. Give change for the difference.`
        : needsReference && !reference.trim()
          ? `Enter the ${REFERENCE_LABELS[method]?.toLowerCase() ?? 'reference number'}.`
          : null;

  const submit = async () => {
    setError(null);
    try {
      const result = await createPayment.mutateAsync({
        requestId: requestId.current,
        invoiceId: id,
        amount,
        paymentMethod: method,
        referenceNumber: needsReference ? reference.trim() : undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      router.replace({
        pathname: '/receipt/[paymentId]',
        params: {
          paymentId: result.payment.id,
          // A duplicate means the receipt may already have been printed.
          justPaid: result.status === 'duplicate' ? '' : '1',
          notice:
            result.status === 'duplicate'
              ? 'This payment was already recorded earlier — no double posting.'
              : result.status === 'adjusted'
                ? result.message
                : '',
        },
      });
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      if (apiError?.isClientError) {
        // The server refused it and recorded nothing usable: next attempt is a new request.
        requestId.current = newRequestId();
        setError({ message: apiError.message, retrySafe: false });
      } else {
        setError({
          message:
            'We could not confirm the payment. Check your signal and tap "Record payment" again — it will not be recorded twice.',
          retrySafe: true,
        });
      }
    }
  };

  const confirm = () => {
    if (validationError) {
      setError({ message: validationError, retrySafe: false });
      return;
    }
    Alert.alert(
      'Record payment?',
      `${formatPeso(amount)} ${PAYMENT_METHOD_LABELS[method]} from ${data.customer.displayName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Record', onPress: () => void submit() },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.name}>{data.customer.displayName}</Text>
          <Row label="Invoice" value={data.invoiceNumber} />
          <Row label="Period" value={data.billingCycleName} />
          <Row label="Balance" value={formatPeso(balance)} strong />
        </Card>

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.chips}>
          {METHODS.map((option) => (
            <Chip
              key={option}
              label={PAYMENT_METHOD_LABELS[option]}
              selected={method === option}
              onPress={() => setMethod(option)}
            />
          ))}
        </View>

        <Field
          label="Amount received"
          value={amountInput}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          selectTextOnFocus
          hint={amount > 0 && amount < balance ? `Partial payment · ${formatPeso(balance - amount)} will remain` : undefined}
        />
        {needsReference ? (
          <Field
            label={REFERENCE_LABELS[method] ?? 'Reference no.'}
            value={reference}
            onChangeText={setReference}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        ) : null}
        <Field
          label="Receipt no. (optional)"
          value={receiptNumber}
          onChangeText={setReceiptNumber}
          hint="Number on your paper receipt, if you issued one."
        />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />

        {error ? <Notice message={error.message} tone={error.retrySafe ? 'warning' : 'danger'} /> : null}

        <Button
          title={`Record ${amount > 0 ? formatPeso(amount) : 'payment'}`}
          onPress={confirm}
          loading={createPayment.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontWeight: '600', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
});
