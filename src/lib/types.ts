// Response shapes of the NDTECH mobile collector API (/mobile/v1/collector).
// Keep in sync with docs/mobile-collector-api.md in NDTECH-ISP-MANAGEMENT.

export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'check' | 'card' | 'other';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type CollectionCaseStatus =
  | 'pending'
  | 'contacted'
  | 'promised_to_pay'
  | 'escalated'
  | 'resolved'
  | 'cancelled';
export type VisitOutcome = 'not_home' | 'contacted' | 'promised' | 'paid' | 'escalated';
export type WriteStatus = 'accepted' | 'adjusted' | 'duplicate';
export type CheckoutStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export type PageMeta = { total: number; page: number; limit: number; hasMore: boolean };
export type Page<T> = { items: T[]; meta: PageMeta };

export type SessionUser = { id: number; name: string; email: string };

export type LoginResponse = {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: SessionUser;
};

export type Profile = SessionUser & { mobileNumber: string | null; roles: string[] };

export type Dashboard = {
  date: string;
  collected: { total: number; count: number; byMethod: Partial<Record<PaymentMethod, number>> };
  visitCount: number;
  assigned: { openInvoiceCount: number; openBalance: number };
  cashOnHand: number;
};

export type AccountSummary = {
  invoiceId: number;
  invoiceNumber: string;
  billingCycleName: string;
  dueDate: string;
  daysOverdue: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  customer: {
    id: number;
    accountNumber: string;
    displayName: string;
    mobileNumber: string;
    status: string;
  };
  address: {
    street: string;
    barangay: string;
    barangayId: number | null;
    municipality: string;
    province: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  subscription: { id: number; status: string; servicePlanName: string | null } | null;
  collectionCase: {
    id: number;
    status: CollectionCaseStatus;
    priority: string;
    isAssignedToMe: boolean;
    lastContactedAt: string | null;
    promiseToPayDate: string | null;
    nextFollowUpDate: string | null;
    notes: string | null;
  } | null;
};

export type AccountDetail = AccountSummary & {
  issueDate: string;
  subtotal: number;
  items: {
    id: number;
    itemType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  recentPayments: {
    id: number;
    paymentNumber: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    receivedBy: string | null;
  }[];
  otherOpenInvoices: {
    invoiceId: number;
    invoiceNumber: string;
    dueDate: string;
    daysOverdue: number;
    balance: number;
    status: InvoiceStatus;
  }[];
};

export type Payment = {
  id: number;
  paymentNumber: string;
  status: 'posted' | 'voided';
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber: string | null;
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    billingCycleName: string;
    status: InvoiceStatus;
    remainingBalance: number;
  };
  customer: { id: number; accountNumber: string; displayName: string };
};

export type PaymentsPage = Page<Payment> & {
  totals: { postedAmount: number; postedCount: number };
};

export type CreatePaymentResult = { status: WriteStatus; message: string; payment: Payment };

export type CaseWriteResult = {
  status: WriteStatus;
  message: string;
  collectionCaseId: number | null;
};

export type OnlineCheckout = {
  id: number;
  status: CheckoutStatus;
  amount: number;
  currency: string;
  checkoutUrl: string | null;
  channel: string | null;
  invoiceId: number;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  payment: { id: number; paymentNumber: string } | null;
};

export type CashOnHand = {
  amount: number;
  paymentCount: number;
  since: string | null;
  lastRemittance: { remittanceNumber: string; remittanceDate: string; periodEnd: string } | null;
};

export type Remittance = {
  id: number;
  remittanceNumber: string;
  status: 'recorded' | 'voided';
  remittanceDate: string;
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  cashReceivedAmount: number;
  variance: number;
  notes: string | null;
  receivedBy: { id: number; name: string };
};
