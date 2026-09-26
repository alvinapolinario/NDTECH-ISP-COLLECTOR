import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate, formatPeso, INVOICE_STATUS_LABELS } from '@/lib/format';
import type { AccountSummary } from '@/lib/types';
import { colors, radius, spacing } from './theme';
import { Badge } from './ui';

export function AccountCard({ account }: { account: AccountSummary }) {
  const overdue = account.daysOverdue > 0;
  const address = account.address
    ? [account.address.street, account.address.barangay].filter(Boolean).join(', ')
    : 'No address on file';

  return (
    <Link href={{ pathname: '/account/[invoiceId]', params: { invoiceId: account.invoiceId } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {account.customer.displayName}
          </Text>
          <Text style={styles.balance}>{formatPeso(account.balance)}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {account.customer.accountNumber} · {account.billingCycleName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {address}
        </Text>
        <View style={styles.badges}>
          <Badge
            label={overdue ? `${account.daysOverdue}d overdue` : `Due ${formatDate(account.dueDate)}`}
            tone={overdue ? 'danger' : 'neutral'}
          />
          {account.status === 'partially_paid' ? (
            <Badge label={INVOICE_STATUS_LABELS.partially_paid} tone="warning" />
          ) : null}
          {account.collectionCase?.promiseToPayDate ? (
            <Badge label={`Promised ${formatDate(account.collectionCase.promiseToPayDate)}`} tone="info" />
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 2,
  },
  pressed: { opacity: 0.8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  balance: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
});
