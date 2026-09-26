export type PairedDevice = {
  name: string;
  address: string;
  /** Bluetooth class is "Imaging" — most thermal printers report this. */
  isPrinter: boolean;
};
