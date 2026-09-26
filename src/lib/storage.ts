import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Phones keep the session in the encrypted keystore. SecureStore does not
// exist on web, so the browser preview (`expo start --web`) falls back to
// localStorage; the web build is for design previews only.
const isWeb = Platform.OS === 'web';

export async function getStoredItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteStoredItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
