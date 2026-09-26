// Re-export the native module. On web, it will be resolved to EscposPrinterModule.web.ts
// and on native platforms to EscposPrinterModule.ts
export { default } from './src/EscposPrinterModule';
export * from './src/EscposPrinter.types';
