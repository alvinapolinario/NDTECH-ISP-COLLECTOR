import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Badge, Card, EmptyState, ErrorState, LoadingState, Row } from '@/components/ui';
import { formatDate, formatPeso } from '@/lib/format';
import { useRemittances } from '@/lib/queries';
import type { Remittance } from '@/lib/types';

export default function RemittancesScreen() {
  const remittances = useRemittances();

  if (remittances.isPending) return <LoadingState />;
  if (remittances.isError) {
    return <ErrorState message={remittances.error.message} onRetry={() => remittances.refetch()} />;
  }

  const items = remittances.data.pages.flatMap((page) => page.items);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <RemittanceCard remittance={item} />}
      contentContainerStyle={items.length ? styles.list : styles.emptyList}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (remittances.hasNextPage && !remittances.isFetchingNextPage) remittances.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl refreshing={remittances.isRefetching && !remittances.isFetchingNextPage} onRefresh={() => remittances.refetch()} />
      }
      ListEmptyComponent={<EmptyState message="No remittances recorded yet. Finance records them when you turn in cash." />}
      ListFooterComponent={remittances.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
    />
  );
}

function RemittanceCard({ remittance }: { remittance: Remittance }) {
  const short = remittance.variance < 0;
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.number}>{remittance.remittanceNumber}</Text>
        {remittance.status === 'voided' ? <Badge label="Voided" tone="danger" /> : null}
      </View>
      <Row label="Date" value={formatDate(remittance.remittanceDate)} />
      <Row label="Covers" value={`${formatDate(remittance.periodStart)} – ${formatDate(remittance.periodEnd)}`} />
      <Row label="Expected" value={formatPeso(remittance.expectedAmount)} />
      <Row label="Turned in" value={formatPeso(remittance.cashReceivedAmount)} strong />
      {remittance.variance !== 0 ? (
        <Row label={short ? 'Short' : 'Over'} value={formatPeso(Math.abs(remittance.variance))} />
      ) : null}
      <Row label="Received by" value={remittance.receivedBy.name} />
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.md },
  footer: { marginVertical: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  number: { fontWeight: '700', color: colors.text },
});
