import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, useWindowDimensions, Switch,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import {
  getCycleEntries,
  DEFAULT_APP_COLORS,
  saveCycleEntry,
  saveDailyLogEntry,
  predictFertilityWindow,
  getRegularityScore,
  getRecentCycleLengths,
  getDailySupportTip,
  getPartnerProfile,
} from '../utils/storage';
import { getCyclePhases, CyclePhase } from '../utils/insights';
import { AppColors, CycleEntry, MOOD_OPTIONS, SYMPTOM_OPTIONS, MoodOption } from '../types';
import { useAppTheme } from '../theme/AppThemeContext';

const DARK_THEME_COLORS: AppColors = {
  primary: '#7DD3FC',
  secondary: '#22D3EE',
  background: '#0F172A',
  card: '#1E293B',
  text: '#E2E8F0',
  muted: '#94A3B8',
};

function readableDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
}

export default function HomeScreen() {
  const { colors, setColors } = useAppTheme();
  const borderSoft = `${colors.muted}33`;
  const { width } = useWindowDimensions();
  const isWide = width > 600;

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
  const [currentPhase, setCurrentPhase] = useState<CyclePhase | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [entryMode, setEntryMode] = useState<'cycle' | 'daily'>('cycle');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<MoodOption[]>(['Neutral']);
  const [moodSearch, setMoodSearch] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [moodOpen, setMoodOpen] = useState(false);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [showStartCal, setShowStartCal] = useState(false);
  const [showEndCal, setShowEndCal] = useState(false);

  const isDarkMode =
    colors.background.toUpperCase() === DARK_THEME_COLORS.background &&
    colors.card.toUpperCase() === DARK_THEME_COLORS.card;

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
    const sorted = [...data].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const lastStart = sorted.length > 0 ? sorted[sorted.length - 1].startDate : undefined;

    setNextCycle(forecast?.nextCycleStart ?? null);
    setOvulationDate(forecast?.ovulationDate ?? null);
    setFertileWindow(
      forecast
        ? `${readableDate(forecast.fertileWindowStart)} to ${readableDate(forecast.fertileWindowEnd)}`
        : null
    );
    setAvgCycleLength(forecast?.averageCycleLength ?? null);
    setRegularityScore(getRegularityScore(data));
    setTrendLengths(getRecentCycleLengths(data));
    setDailyTip(getDailySupportTip(today, forecast, profile));
    setPartnerName(profile.partnerName);
    setPartnerPreferences(profile.partnerPreferences ?? []);

    const phases = getCyclePhases(forecast, lastStart);
    const phase = phases.find((p) => today >= p.start && today <= p.end) ?? null;
    setCurrentPhase(phase);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleDarkMode = async (enabled: boolean) => {
    if (enabled) {
      await setColors(DARK_THEME_COLORS);
      return;
    }
    await setColors(DEFAULT_APP_COLORS);
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const toggleMood = (mood: MoodOption) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleSave = async () => {
    if (!selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Please enter a date in YYYY-MM-DD format.');
      return;
    }
    if (selectedEndDate && !selectedEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid end date', 'Please enter end date as YYYY-MM-DD.');
      return;
    }

    if (entryMode === 'cycle') {
      const entry: CycleEntry = {
        id: selectedDate,
        startDate: selectedDate,
        endDate: selectedEndDate || undefined,
        mood: selectedMoods[0] ?? 'Neutral',
        moods: selectedMoods,
        symptoms: selectedSymptoms,
        notes: notes.trim(),
      };
      await saveCycleEntry(entry);
    } else {
      await saveDailyLogEntry({
        id: selectedDate,
        date: selectedDate,
        moods: selectedMoods,
        symptoms: selectedSymptoms,
        notes: notes.trim(),
      });
    }

    setShowForm(false);
    setSelectedSymptoms([]);
    setSymptomSearch('');
    setMoodSearch('');
    setNotes('');
    setSelectedMoods(['Neutral']);
    setSelectedEndDate('');
    setEntryMode('cycle');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    load();
  };

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const score = regularityScore ?? 70;
  const scoreColor = score >= 80 ? '#4CAF50' : score >= 50 ? '#3949AB' : '#EF5350';

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.title, { color: colors.primary }]}>Cycle Tracker</Text>
          <View style={styles.headerDarkModeControl}>
            <Text style={[styles.darkModeIcon, { color: colors.primary }]}>🌙</Text>
            <Switch
              style={styles.darkModeSwitch}
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>
        {partnerName ? <Text style={[styles.subtitle, { color: colors.muted }]}>Tracking for {partnerName}</Text> : null}

        {/* Phase Banner */}
        {currentPhase && (
          <View style={[styles.phaseBanner, { borderLeftColor: currentPhase.color, backgroundColor: colors.card }]}> 
            <Text style={styles.phaseEmoji}>{currentPhase.emoji}</Text>
            <View style={styles.phaseInfo}>
              <Text style={[styles.phaseLabel, { color: colors.muted }]}>Current Phase</Text>
              <Text style={[styles.phaseName, { color: currentPhase.color }]}>{currentPhase.name}</Text>
              <Text style={[styles.phaseDesc, { color: colors.muted }]}>{currentPhase.description}</Text>
            </View>
          </View>
        )}

        {/* 2-column row for top two cards */}
        <View style={styles.row}>
          <View style={[styles.card, styles.halfCard, { backgroundColor: colors.card }]}> 
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Last Cycle Started</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{readableDate(lastEntry?.startDate)}</Text>
          </View>
          <View style={[styles.card, styles.halfCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Next Predicted Cycle</Text>
            <Text style={[styles.cardValue, { color: colors.primary }]}>{readableDate(nextCycle)}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.importantCard, { backgroundColor: colors.card, borderLeftColor: colors.secondary }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Predicted Ovulation Day</Text>
          <Text style={[styles.cardValue, { color: colors.secondary }]}>{readableDate(ovulationDate)}</Text>
          <Text style={[styles.helperText, { color: colors.muted }]}>Fertile window: {fertileWindow ?? '—'}</Text>
          <Text style={[styles.helperText, { color: colors.muted }]}>Average cycle length used: {avgCycleLength ?? 28} days</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Cycle Regularity Score</Text>
          <Text style={[styles.cardValue, { color: scoreColor }]}>{score}/100</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${score}%` as any, backgroundColor: scoreColor }]} />
          </View>
          <Text style={[styles.helperText, { color: colors.muted }]}>Based on recent cycle-to-cycle variation.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Recent Cycle Lengths</Text>
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
            <Text style={[styles.helperText, { color: colors.muted }]}>Add more entries to view trend data.</Text>
          )}
        </View>

        <View style={[styles.card, styles.tipCard, { backgroundColor: colors.card, borderLeftColor: colors.secondary }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Daily Support Tip</Text>
          <Text style={[styles.tipText, { color: colors.text }]}>{dailyTip}</Text>
        </View>

        {partnerPreferences.length > 0 && (
          <View style={[styles.card, styles.prefCard, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
            <Text style={[styles.cardLabel, { color: colors.muted }]}>
              {partnerName ? `${partnerName}'s Comfort Checklist` : 'Partner Comfort Checklist'}
            </Text>
            <Text style={[styles.helperText, { color: colors.muted }]}>Check if she needs any of these:</Text>
            {partnerPreferences.map((item) => (
              <View key={item} style={styles.prefRow}>
                <Text style={styles.prefBullet}>•</Text>
                <Text style={[styles.prefItem, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>Entry Type</Text>
            <View style={styles.entryModeRow}>
              <TouchableOpacity
                style={[styles.modeChip, entryMode === 'cycle' && styles.modeChipActive, entryMode === 'cycle' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setEntryMode('cycle')}
              >
                <Text style={[styles.modeChipText, entryMode === 'cycle' && styles.modeChipTextActive, { color: entryMode === 'cycle' ? '#fff' : colors.text }]}>
                  Cycle Start
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, entryMode === 'daily' && styles.modeChipActive, entryMode === 'daily' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setEntryMode('daily')}
              >
                <Text style={[styles.modeChipText, entryMode === 'daily' && styles.modeChipTextActive, { color: entryMode === 'daily' ? '#fff' : colors.text }]}>
                  Daily Log
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>
              {entryMode === 'cycle' ? 'Cycle Start Date' : 'Log Date'}
            </Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { borderColor: borderSoft, backgroundColor: colors.background }]}
              onPress={() => { setShowStartCal((v) => !v); setShowEndCal(false); }}
            >
              <Text style={{ color: selectedDate ? colors.text : colors.muted, fontSize: 15 }}>
                {selectedDate ? format(parseISO(selectedDate), 'dd/MM/yy') : 'Select date'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{showStartCal ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showStartCal && (
              <Calendar
                current={selectedDate || format(new Date(), 'yyyy-MM-dd')}
                onDayPress={(day) => { setSelectedDate(day.dateString); setShowStartCal(false); }}
                markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: colors.primary } } : {}}
                theme={{
                  calendarBackground: colors.card,
                  monthTextColor: colors.text,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.muted,
                  textSectionTitleColor: colors.muted,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: colors.card,
                  todayTextColor: colors.primary,
                  arrowColor: colors.primary,
                }}
                style={[styles.inlineCalendar, { borderColor: borderSoft, backgroundColor: colors.card }]}
              />
            )}

            {entryMode === 'cycle' && (
              <>
                <Text style={[styles.label, { color: colors.text }]}>Cycle End Date (optional)</Text>
                <TouchableOpacity
                  style={[styles.datePickerButton, { borderColor: borderSoft, backgroundColor: colors.background }]}
                  onPress={() => { setShowEndCal((v) => !v); setShowStartCal(false); }}
                >
                  <Text style={{ color: selectedEndDate ? colors.text : colors.muted, fontSize: 15 }}>
                    {selectedEndDate ? format(parseISO(selectedEndDate), 'dd/MM/yy') : 'Select end date (optional)'}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{showEndCal ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showEndCal && (
                  <Calendar
                    current={selectedEndDate || selectedDate || format(new Date(), 'yyyy-MM-dd')}
                    onDayPress={(day) => { setSelectedEndDate(day.dateString); setShowEndCal(false); }}
                    markedDates={selectedEndDate ? { [selectedEndDate]: { selected: true, selectedColor: colors.primary } } : {}}
                    theme={{
                      calendarBackground: colors.card,
                      monthTextColor: colors.text,
                      dayTextColor: colors.text,
                      textDisabledColor: colors.muted,
                      textSectionTitleColor: colors.muted,
                      selectedDayBackgroundColor: colors.primary,
                      selectedDayTextColor: colors.card,
                      todayTextColor: colors.primary,
                      arrowColor: colors.primary,
                    }}
                    style={[styles.inlineCalendar, { borderColor: borderSoft, backgroundColor: colors.card }]}
                  />
                )}
              </>
            )}

            <TouchableOpacity style={[styles.accordionHeader, { borderColor: borderSoft }]} onPress={() => setMoodOpen((o) => !o)}>
              <Text style={[styles.label, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Mood</Text>
              <Text style={[styles.accordionMeta, { color: colors.muted }]}>
                {selectedMoods.length > 0 ? `${selectedMoods.length} selected` : 'None'} {moodOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {moodOpen && (
              <>
                <TextInput
                  style={[styles.symptomSearch, { borderColor: borderSoft, color: colors.text, backgroundColor: colors.background }]}
                  value={moodSearch}
                  onChangeText={setMoodSearch}
                  placeholder="Search moods..."
                  placeholderTextColor={colors.muted}
                  clearButtonMode="while-editing"
                />
                <ScrollView style={[styles.symptomScroll, { borderColor: borderSoft, backgroundColor: colors.background }]} contentContainerStyle={styles.chipRow} nestedScrollEnabled>
                  {filteredMoods.length === 0 ? (
                    <Text style={[styles.noResults, { color: colors.muted }]}>No matching moods</Text>
                  ) : (
                    filteredMoods.map((mood) => (
                      <TouchableOpacity
                        key={mood}
                        style={[styles.chip, { borderColor: borderSoft }, selectedMoods.includes(mood) && styles.chipSelected]}
                        onPress={() => toggleMood(mood)}
                      >
                        <Text style={[styles.chipText, { color: colors.text }, selectedMoods.includes(mood) && styles.chipTextSelected]}>
                          {mood}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                {selectedMoods.length > 0 ? (
                  <Text style={[styles.selectedCount, { color: colors.primary }]}>{selectedMoods.length} selected: {selectedMoods.join(', ')}</Text>
                ) : (
                  <Text style={[styles.selectedCount, { color: colors.muted }]}>No moods selected</Text>
                )}
              </>
            )}

            <TouchableOpacity style={[styles.accordionHeader, { borderColor: borderSoft }]} onPress={() => setSymptomsOpen((o) => !o)}>
              <Text style={[styles.label, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Symptoms</Text>
              <Text style={[styles.accordionMeta, { color: colors.muted }]}>
                {selectedSymptoms.length > 0 ? `${selectedSymptoms.length} selected` : 'None'} {symptomsOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {symptomsOpen && (
              <>
                <TextInput
                  style={[styles.symptomSearch, { borderColor: borderSoft, color: colors.text, backgroundColor: colors.background }]}
                  value={symptomSearch}
                  onChangeText={setSymptomSearch}
                  placeholder="Search symptoms..."
                  placeholderTextColor={colors.muted}
                  clearButtonMode="while-editing"
                />
                <ScrollView style={[styles.symptomScroll, { borderColor: borderSoft, backgroundColor: colors.background }]} contentContainerStyle={styles.chipRow} nestedScrollEnabled>
                  {filteredSymptoms.length === 0 ? (
                    <Text style={[styles.noResults, { color: colors.muted }]}>No matching symptoms</Text>
                  ) : (
                    filteredSymptoms.map((symptom) => (
                      <TouchableOpacity
                        key={symptom}
                        style={[styles.chip, { borderColor: borderSoft }, selectedSymptoms.includes(symptom) && styles.chipSelected]}
                        onPress={() => toggleSymptom(symptom)}
                      >
                        <Text style={[styles.chipText, { color: colors.text }, selectedSymptoms.includes(symptom) && styles.chipTextSelected]}>
                          {symptom}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                {selectedSymptoms.length > 0 && (
                  <Text style={[styles.selectedCount, { color: colors.primary }]}>{selectedSymptoms.length} selected: {selectedSymptoms.join(', ')}</Text>
                )}
              </>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { borderColor: borderSoft, color: colors.text, backgroundColor: colors.background }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
            />

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {entryMode === 'cycle' ? 'Save Cycle Entry' : 'Save Daily Log'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.formSpacer} />
      </ScrollView>

      {/* Sticky log button */}
      <View style={[styles.stickyFooter, { backgroundColor: colors.background, borderTopColor: borderSoft }]}> 
        <View style={[styles.stickyInner, isWide && styles.stickyInnerWide]}>
          <TouchableOpacity style={[styles.logButton, { backgroundColor: colors.primary }]} onPress={() => setShowForm(!showForm)}>
            <Text style={styles.logButtonText}>{showForm ? 'Cancel' : '+ Log Entry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#F4F9F8' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 16 },
  contentWide: { maxWidth: 560, width: '100%', alignSelf: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerSpacer: { width: 58 },
  title: { flex: 1, fontSize: 28, fontWeight: '700', color: '#00695C', textAlign: 'center' },
  headerDarkModeControl: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  darkModeIcon: { fontSize: 16 },
  darkModeSwitch: { transform: [{ scale: 0.85 }] },
  subtitle: { marginBottom: 14, textAlign: 'center', color: '#7b6c74', fontSize: 14 },

  // Phase banner
  phaseBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14,
    borderLeftWidth: 5,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  phaseEmoji: { fontSize: 28 },
  phaseInfo: { flex: 1 },
  phaseLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  phaseName: { fontSize: 18, fontWeight: '700', marginTop: 1 },
  phaseDesc: { fontSize: 13, color: '#666', marginTop: 2 },

  // 2-column row
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfCard: { flex: 1, marginBottom: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  importantCard: { borderLeftWidth: 4, borderLeftColor: '#00897B' },
  tipCard: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  prefCard: { borderLeftWidth: 4, borderLeftColor: '#7B1FA2' },
  prefRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  prefBullet: { fontSize: 18, color: '#7B1FA2', marginRight: 8, lineHeight: 22 },
  prefItem: { fontSize: 15, color: '#333' },
  helperText: { marginTop: 6, fontSize: 13, color: '#5f6b6b' },
  tipText: { marginTop: 8, fontSize: 15, color: '#53434b', lineHeight: 22 },

  // Progress bar
  progressTrack: {
    height: 8, borderRadius: 4, backgroundColor: '#E8EAF6', marginTop: 10, overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },

  // Trend chart
  trendWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  trendItem: { alignItems: 'center', width: 34 },
  trendBar: { width: 22, borderRadius: 8, backgroundColor: '#4DB6AC' },
  trendText: { marginTop: 4, fontSize: 11, color: '#666' },

  // Sticky footer button
  stickyFooter: {
    backgroundColor: '#F4F9F8',
    paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E0EEEC',
  },
  stickyInner: { width: '100%' },
  stickyInnerWide: { maxWidth: 560, alignSelf: 'center' },
  logButton: {
    backgroundColor: '#00695C', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  logButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  formSpacer: { height: 8 },

  // Form
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  label: { fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, color: '#333',
  },
  notesInput: { height: 80, textAlignVertical: 'top' },
  datePickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 4,
  },
  inlineCalendar: {
    borderWidth: 1, borderRadius: 10, marginBottom: 8, overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, marginTop: 12, marginBottom: 6,
  },
  accordionMeta: { fontSize: 12 },
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
  entryModeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  modeChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modeChipActive: { backgroundColor: '#00695C', borderColor: '#00695C' },
  modeChipText: { color: '#555', fontSize: 13, fontWeight: '600' },
  modeChipTextActive: { color: '#fff' },
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
