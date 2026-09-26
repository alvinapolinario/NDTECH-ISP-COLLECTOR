import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Badge, Button, Card, ErrorState, LoadingState, Notice, Row } from '@/components/ui';
import { formatDate, formatDateTime, formatPeso, PAYMENT_METHOD_LABELS } from '@/lib/format';
import { isPrintingAvailable, printPaymentReceipt, usePrinterSettings } from '@/lib/printer';
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

type PrintStatus = { tone: 'success' | 'danger'; text: string } | null;

export default function ReceiptScreen() {
  const { paymentId, notice, justPaid } = useLocalSearchParams<{
    paymentId: string;
    notice?: string;
    /** Set when arriving straight from Collect payment: first print is the original. */
    justPaid?: string;
  }>();
  const payment = usePayment(Number(paymentId));
  const printerSettings = usePrinterSettings();

  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<PrintStatus>(null);
  // Only the first print of a freshly recorded payment is the original copy.
  const printCount = useRef(justPaid === '1' ? 0 : 1);
  const autoPrintTried = useRef(false);

  const print = useCallback(async () => {
    const settings = printerSettings.data;
    if (!payment.data || !settings) return;

    if (!settings.printer) {
      router.push('/printer');
      return;
    }

    setPrinting(true);
    setPrintStatus(null);
    try {
      await printPaymentReceipt(settings, payment.data, { reprint: printCount.current > 0 });
      printCount.current += 1;
      setPrintStatus({ tone: 'success', text: `Printed on ${settings.printer.name}.` });
    } catch (error) {
      setPrintStatus({ tone: 'danger', text: error instanceof Error ? error.message : 'Printing failed.' });
    } finally {
      setPrinting(false);
    }
  }, [payment.data, printerSettings.data]);

  useEffect(() => {
    const settings = printerSettings.data;
    if (
      autoPrintTried.current ||
      justPaid !== '1' ||
      !isPrintingAvailable ||
      !payment.data ||
      !settings?.autoPrint ||
      !settings.printer
    ) {
      return;
    }
    autoPrintTried.current = true;
    void print();
  }, [justPaid, payment.data, printerSettings.data, print]);

  if (payment.isPending) return <LoadingState />;
  if (payment.isError) return <ErrorState message={payment.error.message} onRetry={() => payment.refetch()} />;

  const data = payment.data;
  const settled = data.invoice.remainingBalance <= 0;
  const hasPrinter = Boolean(printerSettings.data?.printer);

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

      {printStatus ? (
        <View style={styles.status}>
          <Notice tone={printStatus.tone} message={printStatus.text} />
        </View>
      ) : null}

      <View style={styles.actions}>
        {isPrintingAvailable ? (
          <Button
            title={
              !hasPrinter ? 'Set up printer' : printStatus?.tone === 'success' ? 'Print again' : 'Print receipt'
            }
            onPress={() => void print()}
            loading={printing}
          />
        ) : null}
        <Button title="Share receipt" variant="secondary" onPress={() => void Share.share({ message: receiptText(data) })} />
        <Button
          title="Done"
          variant={isPrintingAvailable ? 'secondary' : 'primary'}
          onPress={() => (router.canDismiss() ? router.dismissAll() : router.replace('/'))}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { alignItems: 'center', marginVertical: spacing.lg, gap: spacing.sm },
  amount: { fontSize: 36, fontWeight: '700', color: colors.text },
  hint: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  status: { marginTop: spacing.lg },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
