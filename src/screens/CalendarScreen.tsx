import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Platform, Switch } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_APP_COLORS,
  getCycleEntries,
  getDailyLogEntries,
  getMarkedDates,
  deleteCycleEntry,
  deleteDailyLogEntry,
  saveDailyLogEntry,
  predictFertilityWindow,
} from '../utils/storage';
import { CycleEntry, DailyLogEntry } from '../types';
import { AppColors } from '../types';
import { useAppTheme } from '../theme/AppThemeContext';

const DARK_THEME_COLORS: AppColors = {
  primary: '#7DD3FC',
  secondary: '#22D3EE',
  background: '#0F172A',
  card: '#1E293B',
  text: '#E2E8F0',
  muted: '#94A3B8',
};

function getEntryMoodText(entry: CycleEntry): string {
  if (entry.moods && entry.moods.length > 0) return entry.moods.join(', ');
  return entry.mood || 'Neutral';
}

function getDailyMoodText(entry: DailyLogEntry): string {
  return entry.moods.length > 0 ? entry.moods.join(', ') : 'Neutral';
}

function isCycleMarkedDate(marking: any): boolean {
  return Boolean(marking?.marked && marking?.dotColor === '#E91E63');
}

function formatReadableDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function getCycleDurationDays(entry: CycleEntry): number | null {
  if (!entry.endDate) return null;
  try {
    const days = differenceInCalendarDays(parseISO(entry.endDate), parseISO(entry.startDate)) + 1;
    return days > 0 ? days : null;
  } catch {
    return null;
  }
}

function getCycleDurationLabel(entry: CycleEntry): string | null {
  const days = getCycleDurationDays(entry);
  if (!days) return null;
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function getCycleRangeText(entry: CycleEntry): string {
  if (!entry.endDate) return formatReadableDate(entry.startDate);
  return `${formatReadableDate(entry.startDate)} - ${formatReadableDate(entry.endDate)}`;
}

export default function CalendarScreen() {
  const { colors, setColors } = useAppTheme();
  const borderSoft = `${colors.muted}33`;
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [selected, setSelected] = useState<CycleEntry | null>(null);
  const [selectedDaily, setSelectedDaily] = useState<DailyLogEntry | null>(null);
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [editingDate, setEditingDate] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'cycle' | 'daily'>('all');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  const isDarkMode =
    colors.background.toUpperCase() === DARK_THEME_COLORS.background &&
    colors.card.toUpperCase() === DARK_THEME_COLORS.card;

  const load = useCallback(async () => {
    const data = await getCycleEntries();
    const logs = await getDailyLogEntries();
    setEntries(data);
    setDailyLogs(logs);
    const marks = getMarkedDates(data);
    logs.forEach((log) => {
      if (!marks[log.date]) {
        marks[log.date] = {
          marked: true,
          dotColor: '#1E88E5',
          selected: true,
          selectedColor: '#90CAF9',
        };
      }
    });
    const forecast = predictFertilityWindow(data);
    if (forecast) {
      marks[forecast.nextCycleStart] = {
        marked: true,
        dotColor: '#E65100',
        selected: true,
        selectedColor: '#FFB74D',
      };

      let cursor = parseISO(forecast.fertileWindowStart);
      const fertileEnd = parseISO(forecast.fertileWindowEnd);
      while (cursor <= fertileEnd) {
        const key = format(cursor, 'yyyy-MM-dd');
        marks[key] = {
          marked: true,
          dotColor: '#6A1B9A',
          selected: true,
          selectedColor: '#CE93D8',
        };
        cursor = addDays(cursor, 1);
      }

      marks[forecast.ovulationDate] = {
        marked: true,
        dotColor: '#00897B',
        selected: true,
        selectedColor: '#4DB6AC',
      };
    }

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todayMark = marks[todayKey] ?? {};
    marks[todayKey] = {
      ...todayMark,
      marked: todayMark.marked ?? false,
      dotColor: todayMark.dotColor ?? colors.primary,
      selected: true,
      selectedColor: colors.primary,
    };

    setMarkedDates(marks);
  }, [colors.card, colors.primary]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDayPress = (day: { dateString: string }) => {
    const entry = entries.find((e) => e.startDate === day.dateString);
    const dailyLog = dailyLogs.find((e) => e.date === day.dateString);

    setSelected(entry ?? null);
    setSelectedDaily(dailyLog ?? null);

    setEditingDate(day.dateString);
    setEditingNotes(dailyLog?.notes ?? '');
    setShowDateEditor(true);
  };

  const handleSaveDateEditor = async () => {
    if (!editingDate) return;

    const existing = dailyLogs.find((e) => e.date === editingDate);
    const nextDaily: DailyLogEntry = existing
      ? {
          ...existing,
          date: editingDate,
          id: editingDate,
          notes: editingNotes.trim(),
        }
      : {
          id: editingDate,
          date: editingDate,
          moods: ['Neutral'],
          symptoms: [],
          notes: editingNotes.trim(),
          intimacyLogged: false,
        };

    await saveDailyLogEntry(nextDaily);
    setShowDateEditor(false);
    await load();

    setSelected(entries.find((e) => e.startDate === editingDate) ?? null);
    setSelectedDaily(nextDaily);
  };

  const handleDelete = (id: string) => {
    const removeEntry = async () => {
      await deleteCycleEntry(id);
      setSelected(null);
      load();
    };

    if (Platform.OS === 'web') {
      const isConfirmed = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Remove this cycle entry?')
        : true;
      if (isConfirmed) {
        void removeEntry();
      }
      return;
    }

    Alert.alert('Delete Entry', 'Remove this cycle entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: removeEntry,
      },
    ]);
  };

  const handleDeleteDailyLog = (id: string) => {
    const removeDaily = async () => {
      await deleteDailyLogEntry(id);
      setSelectedDaily(null);
      load();
    };

    if (Platform.OS === 'web') {
      const isConfirmed = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Remove this daily log?')
        : true;
      if (isConfirmed) {
        void removeDaily();
      }
      return;
    }

    Alert.alert('Delete Daily Log', 'Remove this daily log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: removeDaily,
      },
    ]);
  };

  const historyEntries = [
    ...entries.map((entry) => ({ type: 'cycle' as const, id: entry.id, date: entry.startDate, entry })),
    ...dailyLogs.map((entry) => ({ type: 'daily' as const, id: entry.id, date: entry.date, entry })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const totalCount = historyEntries.length;
  const cycleCount = entries.length;
  const dailyCount = dailyLogs.length;

  const filteredHistoryEntries = historyFilter === 'all'
    ? historyEntries
    : historyEntries.filter((item) => item.type === historyFilter);

  const handleToggleDarkMode = async (enabled: boolean) => {
    if (enabled) {
      await setColors(DARK_THEME_COLORS);
      return;
    }
    await setColors(DEFAULT_APP_COLORS);
  };

  const calendarTheme: any = {
    calendarBackground: colors.card,
    backgroundColor: colors.card,
    monthTextColor: colors.text,
    dayTextColor: colors.text,
    textDisabledColor: colors.muted,
    textSectionTitleColor: colors.muted,
    selectedDayTextColor: colors.card,
    todayTextColor: colors.primary,
    selectedDayBackgroundColor: colors.primary,
    arrowColor: colors.primary,
    dotColor: colors.primary,
    indicatorColor: colors.primary,
    'stylesheet.calendar.main': {
      week: {
        marginTop: 7,
        marginBottom: 7,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.card,
      },
      monthView: {
        backgroundColor: colors.card,
      },
    },
    'stylesheet.day.basic': {
      base: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      },
    },
  };
  const calendarThemeKey = `${colors.background}-${colors.card}-${colors.text}-${colors.primary}-${colors.muted}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.title, { color: colors.primary }]}>Cycle History</Text>
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

      <Calendar
        key={calendarThemeKey}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        enableSwipeMonths
        theme={calendarTheme}
        renderArrow={(direction) => (
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '600', paddingHorizontal: 8 }}>
            {direction === 'left' ? '‹' : '›'}
          </Text>
        )}
        dayComponent={({ date, state, marking }) => {
          if (!date) return <View style={styles.dayCell} />;

          const isCycleDay = isCycleMarkedDate(marking);
          const isSelected = Boolean(marking?.selected) && !isCycleDay;
          const dayTextColor = state === 'disabled'
            ? `${colors.muted}AA`
            : (isSelected ? colors.card : colors.text);

          return (
            <TouchableOpacity
              style={styles.dayCell}
              onPress={() => handleDayPress({ dateString: date.dateString })}
            >
              {isCycleDay ? <Text style={styles.cycleDayIcon}>🩸</Text> : <View style={styles.cycleDayIconSpacer} />}
              <View
                style={[
                  styles.dayNumberCircle,
                  isSelected && { backgroundColor: marking?.selectedColor ?? colors.primary },
                ]}
              >
                <Text style={[styles.dayCellText, { color: dayTextColor }]}>{date.day}</Text>
              </View>
              <View style={styles.dayDotSpacer} />
            </TouchableOpacity>
          );
        }}
        style={[styles.calendar, { backgroundColor: colors.card }]}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendCycleIcon}>🩸</Text>
          <Text style={[styles.legendText, { color: colors.muted }]}>Cycle Days</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#90CAF9' }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Daily Log</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FFB74D' }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Predicted Next</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#CE93D8' }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Fertile Window</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4DB6AC' }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>Ovulation</Text>
        </View>
      </View>

      {selected ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardDate, { color: colors.text }]}>{getCycleRangeText(selected)}</Text>
          {getCycleDurationLabel(selected) ? (
            <Text style={[styles.cardMood, { color: colors.muted }]}>Bleeding length: {getCycleDurationLabel(selected)}</Text>
          ) : null}
          <Text style={[styles.cardMood, { color: colors.muted }]}>Mood: {getEntryMoodText(selected)}</Text>
          {selected.symptoms.length > 0 && (
            <Text style={[styles.cardSymptoms, { color: colors.muted }]}>Symptoms: {selected.symptoms.join(', ')}</Text>
          )}
          {selected.notes ? <Text style={[styles.cardNotes, { color: colors.muted }]}>Notes: {selected.notes}</Text> : null}
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.primary }]} onPress={() => handleDelete(selected.id)}>
            <Text style={styles.deleteButtonText}>Delete Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.hint, { color: colors.muted }]}>Tap a highlighted date to see details.</Text>
      )}

      {selectedDaily ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardDate, { color: colors.text }]}>Daily Log: {selectedDaily.date}</Text>
          {selectedDaily.symptoms.length > 0 && (
            <Text style={[styles.cardSymptoms, { color: colors.muted }]}>Symptoms: {selectedDaily.symptoms.join(', ')}</Text>
          )}
          {selectedDaily.notes ? <Text style={[styles.cardNotes, { color: colors.muted }]}>Notes: {selectedDaily.notes}</Text> : null}
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.primary }]} onPress={() => handleDeleteDailyLog(selectedDaily.id)}>
            <Text style={styles.deleteButtonText}>Delete Daily Log</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>All Logged Entries</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'all' && styles.filterChipActive, historyFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setHistoryFilter('all')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'all' && styles.filterChipTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'cycle' && styles.filterChipActive, historyFilter === 'cycle' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setHistoryFilter('cycle')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'cycle' && styles.filterChipTextActive]}>
              Cycle ({cycleCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'daily' && styles.filterChipActive, historyFilter === 'daily' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setHistoryFilter('daily')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'daily' && styles.filterChipTextActive]}>
              Daily ({dailyCount})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredHistoryEntries.length === 0 ? (
          <Text style={[styles.hintInline, { color: colors.muted }]}>No entries logged yet.</Text>
        ) : (
          filteredHistoryEntries.map((item) => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              style={[styles.historyRow, { borderTopColor: borderSoft }]}
              onPress={() => {
                if (item.type === 'cycle') {
                  setSelected(item.entry);
                  setSelectedDaily(null);
                } else {
                  setSelectedDaily(item.entry);
                  setSelected(null);
                }
              }}
            >
              <View style={styles.historyMeta}>
                <View style={styles.historyHeader}>
                  <View style={[styles.typeBadge, item.type === 'cycle' ? styles.typeBadgeCycle : styles.typeBadgeDaily]}>
                    <Text style={styles.typeBadgeText}>{item.type === 'cycle' ? 'Cycle' : 'Daily'}</Text>
                  </View>
                  <Text style={[styles.historyDate, { color: colors.text }]}> 
                    {item.type === 'cycle' ? getCycleRangeText(item.entry) : formatReadableDate(item.date)}
                  </Text>
                </View>
                {item.type === 'cycle' && getCycleDurationLabel(item.entry) ? (
                  <Text style={[styles.historySub, { color: colors.muted }]} numberOfLines={1}>
                    Bleeding: {getCycleDurationLabel(item.entry)}
                  </Text>
                ) : null}
                {item.type === 'cycle' ? (
                  <Text style={[styles.historyMood, { color: colors.muted }]} numberOfLines={1}>
                    Mood: {getEntryMoodText(item.entry)}
                  </Text>
                ) : null}
                {item.entry.symptoms.length > 0 && (
                  <Text style={[styles.historySub, { color: colors.muted }]} numberOfLines={1}>
                    Symptoms: {item.entry.symptoms.join(', ')}
                  </Text>
                )}
                {item.type === 'daily' && item.entry.notes ? (
                  <Text style={[styles.historySub, { color: colors.muted }]} numberOfLines={1}>
                    Note: {item.entry.notes}
                  </Text>
                ) : null}
              </View>
              <View style={styles.historyActions}>
                <TouchableOpacity
                  style={[styles.historyDeleteButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    if (item.type === 'cycle') {
                      handleDelete(item.id);
                    } else {
                      handleDeleteDailyLog(item.id);
                    }
                  }}
                >
                  <Text style={[styles.historyDeleteButtonText, { color: colors.primary }]}>Delete</Text>
                </TouchableOpacity>
                <Text style={[styles.historyChevron, { color: colors.muted }]}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Modal
        visible={showDateEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateEditor(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: borderSoft }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>Date Details</Text>
            <Text style={[styles.modalDate, { color: colors.muted }]}>{editingDate}</Text>

            <Text style={[styles.modalLabel, styles.modalRow, { color: colors.text, borderTopColor: borderSoft }]}>Notes</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: borderSoft, color: colors.text, backgroundColor: colors.background }]}
              value={editingNotes}
              onChangeText={setEditingNotes}
              placeholder="e.g. Intercourse"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={250}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonGhost, { borderColor: colors.muted }]}
                onPress={() => setShowDateEditor(false)}
              >
                <Text style={[styles.modalButtonGhostText, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveDateEditor}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerSpacer: { width: 58 },
  title: { flex: 1, fontSize: 24, fontWeight: '700', color: '#00695C', textAlign: 'center' },
  headerDarkModeControl: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  darkModeIcon: { fontSize: 16 },
  darkModeSwitch: { transform: [{ scale: 0.85 }] },
  calendar: { borderRadius: 12, elevation: 2 },
  dayCell: {
    width: 34,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDayIcon: { fontSize: 10, lineHeight: 10 },
  cycleDayIconSpacer: { height: 10 },
  dayCellText: { fontSize: 16, fontWeight: '600' },
  dayDotSpacer: { height: 6 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 4, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCycleIcon: { fontSize: 12, lineHeight: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#666' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardDate: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  cardMood: { fontSize: 14, color: '#555', marginBottom: 4 },
  cardSymptoms: { fontSize: 14, color: '#555', marginBottom: 4 },
  cardNotes: { fontSize: 14, color: '#777', fontStyle: 'italic', marginBottom: 8 },
  deleteButton: {
    backgroundColor: '#EF5350', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8,
  },
  deleteButtonText: { color: '#fff', fontWeight: '600' },
  hint: { textAlign: 'center', color: '#aaa', marginTop: 20, fontSize: 14 },
  hintInline: { color: '#aaa', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: '#00695C', borderColor: '#00695C' },
  filterChipText: { color: '#666', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  historyMeta: { flex: 1, paddingRight: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeCycle: { backgroundColor: '#FCE4EC' },
  typeBadgeDaily: { backgroundColor: '#E3F2FD' },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#444' },
  historyDate: { fontSize: 14, fontWeight: '700', color: '#333' },
  historyMood: { fontSize: 13, color: '#555', marginTop: 2 },
  historySub: { fontSize: 12, color: '#888', marginTop: 2 },
  historyChevron: { fontSize: 20, color: '#bbb', lineHeight: 20 },
  historyActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDeleteButton: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyDeleteButtonText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalDate: { marginTop: 4, marginBottom: 10, fontSize: 13 },
  modalRow: { borderTopWidth: 1, paddingTop: 10 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 86,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  modalButtonGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  modalButtonText: { color: '#fff', fontWeight: '700' },
  modalButtonGhostText: { fontWeight: '700' },
});
