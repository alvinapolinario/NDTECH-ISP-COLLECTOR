import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './api';
import type {
  AccountDetail,
  AccountSummary,
  CaseWriteResult,
  CashOnHand,
  CollectionCaseStatus,
  CreatePaymentResult,
  Dashboard,
  InvoiceStatus,
  OnlineCheckout,
  Page,
  Payment,
  PaymentMethod,
  PaymentsPage,
  Profile,
  Remittance,
  VisitOutcome,
} from './types';

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  cashOnHand: ['cash-on-hand'] as const,
  accounts: ['accounts'] as const,
  account: (invoiceId: number) => ['account', invoiceId] as const,
  payments: ['payments'] as const,
  payment: (paymentId: number) => ['payment', paymentId] as const,
  remittances: ['remittances'] as const,
  checkout: (checkoutId: number) => ['checkout', checkoutId] as const,
};

const PAGE_SIZE = 20;

export function useProfile() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => apiRequest<Profile>('/me') });
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiRequest<Dashboard>('/dashboard'),
  });
}

export function useCashOnHand() {
  return useQuery({
    queryKey: queryKeys.cashOnHand,
    queryFn: () => apiRequest<CashOnHand>('/cash-on-hand'),
  });
}

export type AccountFilters = {
  scope: 'assigned' | 'all';
  search: string;
  status?: Extract<InvoiceStatus, 'issued' | 'partially_paid' | 'overdue'>;
  sort: 'due_date' | 'balance' | 'name';
};

export function useAccounts(filters: AccountFilters) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.accounts, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<Page<AccountSummary>>('/accounts', {
        query: { ...filters, search: filters.search.trim(), page: pageParam, limit: PAGE_SIZE },
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

export function useAccount(invoiceId: number) {
  return useQuery({
    queryKey: queryKeys.account(invoiceId),
    queryFn: () => apiRequest<AccountDetail>(`/accounts/${invoiceId}`),
  });
}

export function usePayments(filters: { from?: string; to?: string }) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.payments, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<PaymentsPage>('/payments', {
        query: { ...filters, page: pageParam, limit: PAGE_SIZE },
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

export function usePayment(paymentId: number) {
  return useQuery({
    queryKey: queryKeys.payment(paymentId),
    queryFn: () => apiRequest<Payment>(`/payments/${paymentId}`),
  });
}

export function useRemittances() {
  return useInfiniteQuery({
    queryKey: queryKeys.remittances,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<Page<Remittance>>('/remittances', { query: { page: pageParam, limit: PAGE_SIZE } }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
  });
}

/** Anything that changes an invoice balance or case must refresh these views. */
function useInvalidateCollectionViews() {
  const queryClient = useQueryClient();
  return (invoiceId?: number) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cashOnHand }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.payments }),
      invoiceId !== undefined
        ? queryClient.invalidateQueries({ queryKey: queryKeys.account(invoiceId) })
        : Promise.resolve(),
    ]);
}

export type CreatePaymentInput = {
  requestId: string;
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  receiptNumber?: string;
  notes?: string;
};

export function useCreatePayment() {
  const invalidate = useInvalidateCollectionViews();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) =>
      apiRequest<CreatePaymentResult>('/payments', { method: 'POST', body: input }),
    onSuccess: (result) => invalidate(result.payment.invoice.id),
  });
}

export type RecordVisitInput = {
  invoiceId: number;
  requestId: string;
  outcome: VisitOutcome;
  note?: string;
  latitude?: number;
  longitude?: number;
};

export function useRecordVisit() {
  const invalidate = useInvalidateCollectionViews();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: RecordVisitInput) =>
      apiRequest<CaseWriteResult>(`/accounts/${invoiceId}/visits`, { method: 'POST', body }),
    onSuccess: (_result, input) => invalidate(input.invoiceId),
  });
}

export type RecordFollowUpInput = {
  invoiceId: number;
  requestId: string;
  status: Extract<CollectionCaseStatus, 'pending' | 'contacted' | 'promised_to_pay' | 'escalated'>;
  promiseToPayDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
};

export function useRecordFollowUp() {
  const invalidate = useInvalidateCollectionViews();
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: RecordFollowUpInput) =>
      apiRequest<CaseWriteResult>(`/accounts/${invoiceId}/follow-ups`, { method: 'POST', body }),
    onSuccess: (_result, input) => invalidate(input.invoiceId),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (input: { invoiceId: number; amount?: number }) =>
      apiRequest<OnlineCheckout>('/online-checkouts', { method: 'POST', body: input }),
  });
}

/** Polls every 4 s while the customer is paying; stops once the checkout settles. */
export function useCheckoutStatus(checkoutId: number | null) {
  const invalidate = useInvalidateCollectionViews();
  return useQuery({
    queryKey: queryKeys.checkout(checkoutId ?? 0),
    enabled: checkoutId !== null,
    queryFn: async () => {
      const checkout = await apiRequest<OnlineCheckout>(`/online-checkouts/${checkoutId}`);
      if (checkout.status === 'paid') await invalidate(checkout.invoiceId);
      return checkout;
    },
    refetchInterval: (query) => (query.state.data?.status === 'pending' || !query.state.data ? 4000 : false),
  });
}
