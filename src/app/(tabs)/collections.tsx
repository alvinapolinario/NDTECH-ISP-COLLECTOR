import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/components/theme';
import { Badge, Chip, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { formatDate, formatPeso, manilaToday, PAYMENT_METHOD_LABELS } from '@/lib/format';
import { usePayments } from '@/lib/queries';
import type { Payment } from '@/lib/types';

type Range = 'today' | 'all';

export default function CollectionsScreen() {
  const [range, setRange] = useState<Range>('today');
  const today = manilaToday();
  const payments = usePayments(range === 'today' ? { from: today, to: today } : {});
  const items = payments.data?.pages.flatMap((page) => page.items) ?? [];
  const totals = payments.data?.pages[0]?.totals;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.chips}>
          <Chip label="Today" selected={range === 'today'} onPress={() => setRange('today')} />
          <Chip label="All" selected={range === 'all'} onPress={() => setRange('all')} />
        </View>
        {totals ? (
          <Text style={styles.total}>
            {formatPeso(totals.postedAmount)} · {totals.postedCount} posted
          </Text>
        ) : null}
      </View>

      {payments.isPending ? (
        <LoadingState />
      ) : payments.isError ? (
        <ErrorState message={payments.error.message} onRetry={() => payments.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PaymentRow payment={item} />}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (payments.hasNextPage && !payments.isFetchingNextPage) payments.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl refreshing={payments.isRefetching && !payments.isFetchingNextPage} onRefresh={() => payments.refetch()} />
          }
          ListEmptyComponent={
            <EmptyState message={range === 'today' ? 'No payments collected yet today.' : 'No payments yet.'} />
          }
          ListFooterComponent={payments.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
        />
      )}
    </View>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <Link href={{ pathname: '/receipt/[paymentId]', params: { paymentId: payment.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.rowMain}>
          <Text style={styles.name} numberOfLines={1}>
            {payment.customer.displayName}
          </Text>
          <Text style={styles.meta}>
            {payment.paymentNumber} · {PAYMENT_METHOD_LABELS[payment.paymentMethod]} · {formatDate(payment.paymentDate)}
          </Text>
        </View>
        <View style={styles.rowSide}>
          <Text style={[styles.amount, payment.status === 'voided' && styles.voided]}>{formatPeso(payment.amount)}</Text>
          {payment.status === 'voided' ? <Badge label="Voided" tone="danger" /> : null}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chips: { flexDirection: 'row', gap: spacing.sm },
  total: { fontWeight: '700', color: colors.text },
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.sm },
  footer: { marginVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  rowMain: { flex: 1 },
  rowSide: { alignItems: 'flex-end', gap: spacing.xs },
  name: { fontWeight: '600', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  amount: { fontWeight: '700', color: colors.text, fontSize: 15 },
  voided: { textDecorationLine: 'line-through', color: colors.textMuted },
});
