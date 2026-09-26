import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AccountCard } from '@/components/account-card';
import { colors, radius, spacing } from '@/components/theme';
import { Chip, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { type AccountFilters, useAccounts } from '@/lib/queries';

const SEARCH_DEBOUNCE_MS = 400;

export default function AccountsScreen() {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<AccountFilters>({ scope: 'assigned', search: '', sort: 'due_date' });

  // Wait until the collector stops typing before hitting the server.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((current) => ({ ...current, search: searchText })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const accounts = useAccounts(filters);
  const items = accounts.data?.pages.flatMap((page) => page.items) ?? [];
  const total = accounts.data?.pages[0]?.meta.total ?? 0;

  const setFilter = <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search name, account no., mobile, invoice"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Assigned to me" selected={filters.scope === 'assigned'} onPress={() => setFilter('scope', 'assigned')} />
          <Chip label="All accounts" selected={filters.scope === 'all'} onPress={() => setFilter('scope', 'all')} />
          <Chip
            label="Overdue only"
            selected={filters.status === 'overdue'}
            onPress={() => setFilter('status', filters.status === 'overdue' ? undefined : 'overdue')}
          />
          <Chip label="Oldest due" selected={filters.sort === 'due_date'} onPress={() => setFilter('sort', 'due_date')} />
          <Chip label="Biggest balance" selected={filters.sort === 'balance'} onPress={() => setFilter('sort', 'balance')} />
          <Chip label="Name" selected={filters.sort === 'name'} onPress={() => setFilter('sort', 'name')} />
        </ScrollView>
      </View>

      {accounts.isPending ? (
        <LoadingState />
      ) : accounts.isError ? (
        <ErrorState message={accounts.error.message} onRetry={() => accounts.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.invoiceId)}
          renderItem={({ item }) => <AccountCard account={item} />}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (accounts.hasNextPage && !accounts.isFetchingNextPage) accounts.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl refreshing={accounts.isRefetching && !accounts.isFetchingNextPage} onRefresh={() => accounts.refetch()} />
          }
          ListHeaderComponent={
            items.length ? (
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {total} unpaid account{total === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              message={
                filters.scope === 'assigned' && !filters.search
                  ? 'No accounts are assigned to you. Try "All accounts" or search for a customer.'
                  : 'No unpaid accounts match your search.'
              }
            />
          }
          ListFooterComponent={accounts.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  search: {
    marginHorizontal: spacing.lg,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.md },
  count: { color: colors.textMuted, marginBottom: spacing.md },
  footer: { marginVertical: spacing.lg },
});
