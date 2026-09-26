import * as Crypto from 'expo-crypto';
import { getStoredItem, setStoredItem } from './storage';

const DEVICE_ID_KEY = 'ndtech.deviceId';

/** Stable per-install ID sent as X-Device-Id so the office can trace each write to a phone. */
export async function getDeviceId() {
  const existing = await getStoredItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await setStoredItem(DEVICE_ID_KEY, created);
  return created;
}

export function newRequestId() {
  return Crypto.randomUUID();
}
