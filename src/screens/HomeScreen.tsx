import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert,
} from 'react-native';
import { format } from 'date-fns';
import {
  getCycleEntries,
  saveCycleEntry,
  predictFertilityWindow,
  getRegularityScore,
  getRecentCycleLengths,
  getDailySupportTip,
  getPartnerProfile,
} from '../utils/storage';
import { CycleEntry, MOOD_OPTIONS, SYMPTOM_OPTIONS, MoodOption } from '../types';

export default function HomeScreen() {
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [nextCycle, setNextCycle] = useState<string | null>(null);
  const [ovulationDate, setOvulationDate] = useState<string | null>(null);
  const [fertileWindow, setFertileWindow] = useState<string | null>(null);
  const [avgCycleLength, setAvgCycleLength] = useState<number | null>(null);
  const [regularityScore, setRegularityScore] = useState<number | null>(null);
  const [dailyTip, setDailyTip] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [trendLengths, setTrendLengths] = useState<number[]>([]);
  const [partnerPreferences, setPartnerPreferences] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMood, setSelectedMood] = useState<MoodOption>('Neutral');
  const [moodSearch, setMoodSearch] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [notes, setNotes] = useState('');

  const filteredMoods = useMemo(() => {
    const q = moodSearch.trim().toLowerCase();
    if (!q) return MOOD_OPTIONS;
    return MOOD_OPTIONS.filter((m) => m.toLowerCase().includes(q));
  }, [moodSearch]);

  const filteredSymptoms = useMemo(() => {
    const q = symptomSearch.trim().toLowerCase();
    if (!q) return SYMPTOM_OPTIONS;
    return SYMPTOM_OPTIONS.filter((s) => s.toLowerCase().includes(q));
  }, [symptomSearch]);

  const load = useCallback(async () => {
    const data = await getCycleEntries();
    const profile = await getPartnerProfile();
    setEntries(data);
    const forecast = predictFertilityWindow(data);
    const today = format(new Date(), 'yyyy-MM-dd');

    setNextCycle(forecast?.nextCycleStart ?? null);
    setOvulationDate(forecast?.ovulationDate ?? null);
    setFertileWindow(
      forecast ? `${forecast.fertileWindowStart} to ${forecast.fertileWindowEnd}` : null
    );
    setAvgCycleLength(forecast?.averageCycleLength ?? null);
    setRegularityScore(getRegularityScore(data));
    setTrendLengths(getRecentCycleLengths(data));
    setDailyTip(getDailySupportTip(today, forecast, profile));
    setPartnerName(profile.partnerName);
    setPartnerPreferences(profile.partnerPreferences ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSave = async () => {
    if (!selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }
    const entry: CycleEntry = {
      id: selectedDate,
      startDate: selectedDate,
      mood: selectedMood,
      symptoms: selectedSymptoms,
      notes: notes.trim(),
    };
    await saveCycleEntry(entry);
    setShowForm(false);
    setSelectedSymptoms([]);
    setSymptomSearch('');
    setMoodSearch('');
    setNotes('');
    setSelectedMood('Neutral');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    load();
  };

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cycle Tracker</Text>
      {partnerName ? <Text style={styles.subtitle}>Tracking for {partnerName}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Last Cycle Started</Text>
        <Text style={styles.cardValue}>{lastEntry ? lastEntry.startDate : '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Next Predicted Cycle</Text>
        <Text style={[styles.cardValue, { color: '#00695C' }]}>{nextCycle ?? '—'}</Text>
      </View>

      <View style={[styles.card, styles.importantCard]}>
        <Text style={styles.cardLabel}>Predicted Ovulation Day</Text>
        <Text style={[styles.cardValue, { color: '#00897B' }]}>{ovulationDate ?? '—'}</Text>
        <Text style={styles.helperText}>Fertile window: {fertileWindow ?? '—'}</Text>
        <Text style={styles.helperText}>Average cycle length used: {avgCycleLength ?? 28} days</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Cycle Regularity Score</Text>
        <Text style={[styles.cardValue, { color: '#3949AB' }]}>{regularityScore ?? 70}/100</Text>
        <Text style={styles.helperText}>Based on recent cycle-to-cycle variation.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recent Cycle Lengths</Text>
        {trendLengths.length > 0 ? (
          <View style={styles.trendWrap}>
            {trendLengths.map((days, index) => (
              <View key={`${days}-${index}`} style={styles.trendItem}>
                <View style={[styles.trendBar, { height: Math.max(16, Math.min(46, days)) }]} />
                <Text style={styles.trendText}>{days}d</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>Add more entries to view trend data.</Text>
        )}
      </View>

      <View style={[styles.card, styles.tipCard]}>
        <Text style={styles.cardLabel}>Daily Support Tip</Text>
        <Text style={styles.tipText}>{dailyTip}</Text>
      </View>

      {partnerPreferences.length > 0 && (
        <View style={[styles.card, styles.prefCard]}>
          <Text style={styles.cardLabel}>
            {partnerName ? `${partnerName}'s Comfort Checklist` : 'Partner Comfort Checklist'}
          </Text>
          <Text style={styles.helperText}>Check if she needs any of these:</Text>
          {partnerPreferences.map((item) => (
            <View key={item} style={styles.prefRow}>
              <Text style={styles.prefBullet}>•</Text>
              <Text style={styles.prefItem}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.logButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.logButtonText}>{showForm ? 'Cancel' : '+ Log Cycle Start'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="e.g. 2026-04-27"
            maxLength={10}
          />

          <Text style={styles.label}>Mood</Text>
          <TextInput
            style={styles.symptomSearch}
            value={moodSearch}
            onChangeText={setMoodSearch}
            placeholder="Search moods..."
            clearButtonMode="while-editing"
          />
          <ScrollView style={styles.symptomScroll} contentContainerStyle={styles.chipRow} nestedScrollEnabled>
            {filteredMoods.length === 0 ? (
              <Text style={styles.noResults}>No matching moods</Text>
            ) : (
              filteredMoods.map((mood) => (
                <TouchableOpacity
                  key={mood}
                  style={[styles.chip, selectedMood === mood && styles.chipSelected]}
                  onPress={() => setSelectedMood(mood)}
                >
                  <Text style={[styles.chipText, selectedMood === mood && styles.chipTextSelected]}>
                    {mood}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <Text style={styles.selectedCount}>Selected: {selectedMood}</Text>

          <Text style={styles.label}>Symptoms</Text>
          <TextInput
            style={styles.symptomSearch}
            value={symptomSearch}
            onChangeText={setSymptomSearch}
            placeholder="Search symptoms..."
            clearButtonMode="while-editing"
          />
          <ScrollView style={styles.symptomScroll} contentContainerStyle={styles.chipRow} nestedScrollEnabled>
            {filteredSymptoms.length === 0 ? (
              <Text style={styles.noResults}>No matching symptoms</Text>
            ) : (
              filteredSymptoms.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[styles.chip, selectedSymptoms.includes(symptom) && styles.chipSelected]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[styles.chipText, selectedSymptoms.includes(symptom) && styles.chipTextSelected]}>
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          {selectedSymptoms.length > 0 && (
            <Text style={styles.selectedCount}>{selectedSymptoms.length} selected: {selectedSymptoms.join(', ')}</Text>
          )}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes..."
            multiline
            maxLength={500}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#00695C', marginBottom: 20, textAlign: 'center' },
  subtitle: { marginTop: -14, marginBottom: 16, textAlign: 'center', color: '#7b6c74', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '600', color: '#333' },
  importantCard: { borderLeftWidth: 4, borderLeftColor: '#00897B' },
  tipCard: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  prefCard: { borderLeftWidth: 4, borderLeftColor: '#F6F3F5' },
  prefRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  prefBullet: { fontSize: 18, color: '#F6F3F5', marginRight: 8, lineHeight: 22 },
  prefItem: { fontSize: 15, color: '#333' },
  helperText: { marginTop: 6, fontSize: 13, color: '#5f6b6b' },
  tipText: { marginTop: 8, fontSize: 15, color: '#53434b', lineHeight: 22 },
  trendWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  trendItem: { alignItems: 'center', width: 34 },
  trendBar: { width: 22, borderRadius: 8, backgroundColor: '#4DB6AC' },
  trendText: { marginTop: 4, fontSize: 11, color: '#666' },
  logButton: {
    backgroundColor: '#00695C', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  logButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  label: { fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, color: '#333',
  },
  notesInput: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8 },
  symptomSearch: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 9, fontSize: 14, color: '#333', marginBottom: 6, backgroundColor: '#fafafa',
  },
  symptomScroll: {
    maxHeight: 160,
    borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  noResults: { color: '#aaa', fontSize: 13, padding: 8, fontStyle: 'italic' },
  selectedCount: { marginTop: 6, fontSize: 12, color: '#00695C', fontStyle: 'italic' },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipSelected: { backgroundColor: '#00695C', borderColor: '#00695C' },
  chipText: { color: '#555', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#00695C', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 16,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
