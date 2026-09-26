import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { PairedDevice } from './EscposPrinter.types';

declare class EscposPrinterModule extends NativeModule {
  isSupported(): boolean;
  isEnabled(): boolean;
  hasConnectPermission(): boolean;
  getPairedDevicesAsync(): Promise<PairedDevice[]>;
  /** Sends raw ESC/POS bytes (base64) to a paired printer over Bluetooth SPP. */
  printAsync(address: string, base64Data: string): Promise<void>;
}

// Optional: the module is missing in Expo Go and on web, where printing is unavailable.
export default requireOptionalNativeModule<EscposPrinterModule>('EscposPrinter');
