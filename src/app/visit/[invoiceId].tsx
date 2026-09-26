import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing } from '@/components/theme';
import { Button, Chip, Field, Notice } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { newRequestId } from '@/lib/device';
import { manilaToday, VISIT_OUTCOME_LABELS } from '@/lib/format';
import { useRecordFollowUp, useRecordVisit } from '@/lib/queries';
import type { VisitOutcome } from '@/lib/types';

const OUTCOMES: VisitOutcome[] = ['not_home', 'contacted', 'promised', 'escalated'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Best-effort GPS fix; a visit is still saved without one. */
async function currentCoordinates() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return undefined;

  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

export default function VisitScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const id = Number(invoiceId);
  const recordVisit = useRecordVisit();
  const recordFollowUp = useRecordFollowUp();

  // Separate request IDs so a retry after a timeout re-sends the same writes.
  const visitRequestId = useRef(newRequestId());
  const followUpRequestId = useRef(newRequestId());
  const visitSaved = useRef(false);

  const [outcome, setOutcome] = useState<VisitOutcome>('not_home');
  const [note, setNote] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [attachLocation, setAttachLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const needsPromiseDate = outcome === 'promised';

  const save = async () => {
    if (needsPromiseDate && !DATE_PATTERN.test(promiseDate)) {
      setError('Enter the promised payment date as YYYY-MM-DD.');
      return;
    }
    if (followUpDate && !DATE_PATTERN.test(followUpDate)) {
      setError('Enter the follow-up date as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!visitSaved.current) {
        const coords = attachLocation ? await currentCoordinates().catch(() => undefined) : undefined;
        await recordVisit.mutateAsync({
          invoiceId: id,
          requestId: visitRequestId.current,
          outcome,
          note: note.trim() || undefined,
          ...coords,
        });
        visitSaved.current = true;
      }

      const followUpStatus =
        outcome === 'promised' ? 'promised_to_pay' : outcome === 'escalated' ? 'escalated' : outcome === 'contacted' ? 'contacted' : null;

      if (followUpStatus || followUpDate) {
        await recordFollowUp.mutateAsync({
          invoiceId: id,
          requestId: followUpRequestId.current,
          status: followUpStatus ?? 'pending',
          promiseToPayDate: needsPromiseDate ? promiseDate : undefined,
          nextFollowUpDate: followUpDate || undefined,
          notes: note.trim() || undefined,
        });
      }

      router.back();
    } catch (caught) {
      if (caught instanceof ApiError && caught.isClientError) {
        // Rejected by the server: the next attempt must use a fresh request ID.
        if (!visitSaved.current) visitRequestId.current = newRequestId();
        followUpRequestId.current = newRequestId();
        setError(caught.message);
      } else {
        setError('Could not reach the server. Tap Save again — nothing will be recorded twice.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>What happened?</Text>
        <View style={styles.chips}>
          {OUTCOMES.map((option) => (
            <Chip
              key={option}
              label={VISIT_OUTCOME_LABELS[option]}
              selected={outcome === option}
              onPress={() => setOutcome(option)}
            />
          ))}
        </View>

        {needsPromiseDate ? (
          <Field
            label="Promised payment date"
            value={promiseDate}
            onChangeText={setPromiseDate}
            placeholder={manilaToday()}
            keyboardType="numbers-and-punctuation"
            hint="Format: YYYY-MM-DD"
          />
        ) : null}
        <Field
          label="Next follow-up (optional)"
          value={followUpDate}
          onChangeText={setFollowUpDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <Field label="Note" value={note} onChangeText={setNote} multiline placeholder="e.g. Gate locked, left a notice" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Attach my location</Text>
          <Switch value={attachLocation} onValueChange={setAttachLocation} />
        </View>

        {error ? <Notice message={error} /> : null}
        <Button title="Save visit" onPress={save} loading={saving} />
        <Text style={styles.hint}>
          To record money received, use Collect payment on the account screen.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  label: { fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  switchLabel: { color: colors.text, fontWeight: '500' },
  hint: { color: colors.textMuted, marginTop: spacing.md, fontSize: 13 },
});
