import type { CollectionCaseStatus, InvoiceStatus, PaymentMethod, VisitOutcome } from './types';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function formatPeso(value: number) {
  return peso.format(value);
}

/** 'YYYY-MM-DD' → 'Sep 26, 2026' without shifting the day across time zones. */
export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Today's date (YYYY-MM-DD) in the Philippines. */
export function manilaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  bank_transfer: 'Bank transfer',
  check: 'Check',
  card: 'Card',
  other: 'Other',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Unpaid',
  partially_paid: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const CASE_STATUS_LABELS: Record<CollectionCaseStatus, string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  promised_to_pay: 'Promised to pay',
  escalated: 'Escalated',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  not_home: 'Not home',
  contacted: 'Talked to customer',
  promised: 'Promised to pay',
  paid: 'Paid',
  escalated: 'Escalate',
};
