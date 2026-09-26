import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'ndtech.deviceId';

/** Stable per-install ID sent as X-Device-Id so the office can trace each write to a phone. */
export async function getDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created);
  return created;
}

export function newRequestId() {
  return Crypto.randomUUID();
}
