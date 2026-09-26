import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PermissionsAndroid, Platform } from 'react-native';
import EscposPrinter, { type PairedDevice } from '../../modules/escpos-printer';
import { toBase64, type PaperWidth } from './escpos';
import { buildPaymentReceipt, buildTestPage } from './receipt-printout';
import { getStoredItem, setStoredItem } from './storage';
import type { Payment } from './types';

export type { PairedDevice };

export type PrinterSettings = {
  printer: { name: string; address: string } | null;
  paperWidth: PaperWidth;
  /** Print the receipt automatically right after a payment is recorded. */
  autoPrint: boolean;
};

const SETTINGS_KEY = 'ndtech.printer';
const DEFAULT_SETTINGS: PrinterSettings = { printer: null, paperWidth: 58, autoPrint: true };
const settingsKey = ['printer-settings'] as const;

/** False in Expo Go / web: the native Bluetooth module only exists in the NDTECH app build. */
export const isPrintingAvailable = Platform.OS === 'android' && EscposPrinter !== null;

async function loadSettings(): Promise<PrinterSettings> {
  const raw = await getStoredItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PrinterSettings>) } : DEFAULT_SETTINGS;
}

export function usePrinterSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: loadSettings, staleTime: Infinity });
}

export function useSavePrinterSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<PrinterSettings>) => {
      const next = { ...(await loadSettings()), ...changes };
      await setStoredItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => queryClient.setQueryData(settingsKey, next),
  });
}

export class PrinterError extends Error {}

function requireModule() {
  if (!isPrintingAvailable || !EscposPrinter) {
    throw new PrinterError('Printing needs the NDTECH Collector app build. It does not work in Expo Go.');
  }
  return EscposPrinter;
}

/** Android 12+ asks for "Nearby devices" before the app may talk to paired printers. */
export async function ensureBluetoothPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 31) return true;
  const permission = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
  if (await PermissionsAndroid.check(permission)) return true;
  const result = await PermissionsAndroid.request(permission, {
    title: 'Allow printer connection',
    message: 'NDTECH Collector needs the Nearby devices permission to print receipts on your Bluetooth printer.',
    buttonPositive: 'Allow',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function isBluetoothEnabled() {
  return EscposPrinter?.isEnabled() ?? false;
}

export async function getPairedDevices(): Promise<PairedDevice[]> {
  const printer = requireModule();
  if (!(await ensureBluetoothPermission())) {
    throw new PrinterError('Bluetooth permission was denied. Allow "Nearby devices" in the app settings.');
  }
  return printer.getPairedDevicesAsync();
}

async function send(settings: PrinterSettings, bytes: Uint8Array) {
  const printer = requireModule();
  if (!settings.printer) {
    throw new PrinterError('No printer selected. Choose your printer in Me → Printer.');
  }
  if (!(await ensureBluetoothPermission())) {
    throw new PrinterError('Bluetooth permission was denied. Allow "Nearby devices" in the app settings.');
  }
  await printer.printAsync(settings.printer.address, toBase64(bytes));
}

export function printPaymentReceipt(settings: PrinterSettings, payment: Payment, options: { reprint: boolean }) {
  return send(settings, buildPaymentReceipt(payment, settings.paperWidth, options));
}

export function printTestPage(settings: PrinterSettings) {
  return send(settings, buildTestPage(settings.paperWidth, settings.printer?.name ?? 'Printer'));
}
