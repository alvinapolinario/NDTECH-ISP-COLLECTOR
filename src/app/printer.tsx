import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/components/theme';
import { Badge, Button, Card, Chip, Notice, SectionTitle } from '@/components/ui';
import {
  getPairedDevices,
  isBluetoothEnabled,
  isPrintingAvailable,
  printTestPage,
  usePrinterSettings,
  useSavePrinterSettings,
  type PairedDevice,
} from '@/lib/printer';

function openBluetoothSettings() {
  void Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => Linking.openSettings());
}

export default function PrinterScreen() {
  const settings = usePrinterSettings();
  const save = useSavePrinterSettings();
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'danger' } | null>(null);

  const devices = useQuery({
    queryKey: ['paired-printers'],
    queryFn: getPairedDevices,
    enabled: isPrintingAvailable,
    retry: false,
  });

  if (!isPrintingAvailable) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Notice
          tone="warning"
          message="Bluetooth printing needs the NDTECH Collector app build. It does not work inside Expo Go or the browser preview."
        />
      </ScrollView>
    );
  }

  const current = settings.data;
  const bluetoothOn = isBluetoothEnabled();

  const choose = (device: PairedDevice) => {
    setMessage(null);
    save.mutate({ printer: { name: device.name, address: device.address } });
  };

  const testPrint = async () => {
    if (!current) return;
    setTesting(true);
    setMessage(null);
    try {
      await printTestPage(current);
      setMessage({ text: 'Test page sent. Check the printer.', tone: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Printing failed.', tone: 'danger' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!bluetoothOn ? (
        <Notice tone="warning" message="Bluetooth is off. Turn it on to see and use your printer." />
      ) : null}

      <SectionTitle>Paired printers</SectionTitle>
      <Text style={styles.hint}>
        Pair the printer first in the phone&apos;s Bluetooth settings (the PIN is usually 0000 or 1234), then choose it
        here.
      </Text>

      <Card style={styles.list}>
        {devices.isPending ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : devices.isError ? (
          <Text style={styles.error}>{devices.error.message}</Text>
        ) : devices.data.length === 0 ? (
          <Text style={styles.empty}>No paired Bluetooth devices yet.</Text>
        ) : (
          devices.data.map((device) => {
            const selected = current?.printer?.address === device.address;
            return (
              <Pressable
                key={device.address}
                onPress={() => choose(device)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.device, selected && styles.deviceSelected, pressed && styles.pressed]}
              >
                <Ionicons
                  name={device.isPrinter ? 'print-outline' : 'bluetooth-outline'}
                  size={22}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <View style={styles.deviceText}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceAddress}>{device.address}</Text>
                </View>
                {device.isPrinter ? <Badge label="Printer" tone="info" /> : null}
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })
        )}
      </Card>

      <View style={styles.row}>
        <Button title="Refresh" variant="secondary" onPress={() => devices.refetch()} style={styles.flex} />
        <Button title="Bluetooth settings" variant="secondary" onPress={openBluetoothSettings} style={styles.flex} />
      </View>

      <SectionTitle>Paper size</SectionTitle>
      <View style={styles.chips}>
        <Chip label="58 mm (small)" selected={current?.paperWidth === 58} onPress={() => save.mutate({ paperWidth: 58 })} />
        <Chip label="80 mm (wide)" selected={current?.paperWidth === 80} onPress={() => save.mutate({ paperWidth: 80 })} />
      </View>

      <SectionTitle>Options</SectionTitle>
      <Card>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.switchLabel}>Print automatically</Text>
            <Text style={styles.hint}>Print the receipt right after a payment is recorded.</Text>
          </View>
          <Switch
            value={current?.autoPrint ?? true}
            onValueChange={(autoPrint) => save.mutate({ autoPrint })}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>

      {message ? <View style={styles.message}><Notice tone={message.tone} message={message.text} /></View> : null}

      <Button
        title={current?.printer ? `Print test page on ${current.printer.name}` : 'Choose a printer first'}
        onPress={() => void testPrint()}
        loading={testing}
        disabled={!current?.printer}
        style={styles.test}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  list: { padding: 0, overflow: 'hidden' },
  loading: { padding: spacing.xl },
  error: { color: colors.danger, padding: spacing.lg },
  empty: { color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  deviceSelected: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
  deviceText: { flex: 1 },
  deviceName: { fontWeight: '600', color: colors.text, fontSize: 15 },
  deviceAddress: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontWeight: '600', color: colors.text, marginBottom: 2 },
  message: { marginTop: spacing.lg },
  test: { marginTop: spacing.lg, borderRadius: radius.md },
});
