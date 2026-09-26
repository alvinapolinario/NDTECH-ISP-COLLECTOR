import { EscPosBuilder, type PaperWidth } from './escpos';
import { formatDate, formatPeso, PAYMENT_METHOD_LABELS } from './format';
import type { Payment } from './types';

export const COMPANY_NAME = 'NDTECH';

function printedAt() {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Collector's payment acknowledgement slip. `reprint` marks copies printed
 * after the original so they can't pass as a second payment.
 */
export function buildPaymentReceipt(payment: Payment, paperWidth: PaperWidth, options: { reprint: boolean }) {
  const receipt = new EscPosBuilder(paperWidth);
  const voided = payment.status === 'voided';

  receipt.align('center').bold(true).size(2).line(COMPANY_NAME).size(1).bold(false);
  receipt.line('Payment Acknowledgement');
  if (options.reprint) receipt.bold(true).line('*** REPRINT ***').bold(false);
  if (voided) receipt.bold(true).line('*** VOIDED ***').bold(false);

  receipt.align('left').divider();
  receipt.row('Payment no.', payment.paymentNumber);
  receipt.row('Date', formatDate(payment.paymentDate));
  receipt.divider();

  receipt.line(payment.customer.displayName);
  receipt.row('Account no.', payment.customer.accountNumber);
  receipt.row('Invoice', payment.invoice.invoiceNumber);
  receipt.row('Period', payment.invoice.billingCycleName);
  receipt.divider();

  receipt.bold(true).row('AMOUNT PAID', formatPeso(payment.amount)).bold(false);
  receipt.row('Method', PAYMENT_METHOD_LABELS[payment.paymentMethod]);
  if (payment.referenceNumber) receipt.row('Reference', payment.referenceNumber);
  receipt.row('Balance left', formatPeso(payment.invoice.remainingBalance));
  receipt.divider();

  receipt.row('Collector', payment.receivedBy ?? '-');
  receipt.row('Printed', printedAt());
  receipt.newline();

  receipt.align('center');
  receipt.line('Thank you for your payment!');
  receipt.line('This is not an official receipt.');
  receipt.feed(4).cut();

  return receipt.build();
}

export function buildTestPage(paperWidth: PaperWidth, printerName: string) {
  const page = new EscPosBuilder(paperWidth);
  page.align('center').bold(true).size(2).line(COMPANY_NAME).size(1).bold(false);
  page.line('Printer test');
  page.align('left').divider();
  page.row('Printer', printerName);
  page.row('Paper', `${paperWidth} mm (${page.width} chars)`);
  page.row('Printed', printedAt());
  page.divider();
  page.line('Normal text: The quick brown fox jumps over the lazy dog.');
  page.bold(true).line('Bold text').bold(false);
  page.size(1, 2).line('Tall text').size(1);
  page.row('Left column', formatPeso(1500));
  page.divider('=');
  page.align('center').line('If this looks right, you are ready to print receipts.');
  page.feed(4).cut();
  return page.build();
}
