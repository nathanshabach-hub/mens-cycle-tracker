import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { addDays, format, parseISO } from 'date-fns';
import {
  getCycleEntries,
  getDailyLogEntries,
  getMarkedDates,
  deleteCycleEntry,
  deleteDailyLogEntry,
  predictFertilityWindow,
} from '../utils/storage';
import { CycleEntry, DailyLogEntry } from '../types';

function getEntryMoodText(entry: CycleEntry): string {
  if (entry.moods && entry.moods.length > 0) return entry.moods.join(', ');
  return entry.mood || 'Neutral';
}

function getDailyMoodText(entry: DailyLogEntry): string {
  return entry.moods.length > 0 ? entry.moods.join(', ') : 'Neutral';
}

export default function CalendarScreen() {
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [selected, setSelected] = useState<CycleEntry | null>(null);
  const [selectedDaily, setSelectedDaily] = useState<DailyLogEntry | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'cycle' | 'daily'>('all');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

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
    setMarkedDates(marks);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDayPress = (day: { dateString: string }) => {
    const entry = entries.find((e) => e.startDate === day.dateString);
    const dailyLog = dailyLogs.find((e) => e.date === day.dateString);
    setSelected(entry ?? null);
    setSelectedDaily(dailyLog ?? null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this cycle entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteCycleEntry(id);
          setSelected(null);
          load();
        },
      },
    ]);
  };

  const handleDeleteDailyLog = (id: string) => {
    Alert.alert('Delete Daily Log', 'Remove this daily log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDailyLogEntry(id);
          setSelectedDaily(null);
          load();
        },
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cycle History</Text>

      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        enableSwipeMonths
        theme={{
          todayTextColor: '#00695C',
          selectedDayBackgroundColor: '#00695C',
          arrowColor: '#00695C',
          dotColor: '#00695C',
        }}
        style={styles.calendar}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#E91E63' }]} />
          <Text style={styles.legendText}>Cycle Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#90CAF9' }]} />
          <Text style={styles.legendText}>Daily Log</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FFB74D' }]} />
          <Text style={styles.legendText}>Predicted Next</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#CE93D8' }]} />
          <Text style={styles.legendText}>Fertile Window</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4DB6AC' }]} />
          <Text style={styles.legendText}>Ovulation</Text>
        </View>
      </View>

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardDate}>{selected.startDate}</Text>
          {selected.endDate ? <Text style={styles.cardMood}>End: {selected.endDate}</Text> : null}
          <Text style={styles.cardMood}>Mood: {getEntryMoodText(selected)}</Text>
          {selected.symptoms.length > 0 && (
            <Text style={styles.cardSymptoms}>Symptoms: {selected.symptoms.join(', ')}</Text>
          )}
          {selected.notes ? <Text style={styles.cardNotes}>Notes: {selected.notes}</Text> : null}
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(selected.id)}>
            <Text style={styles.deleteButtonText}>Delete Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.hint}>Tap a highlighted date to see details.</Text>
      )}

      {selectedDaily ? (
        <View style={styles.card}>
          <Text style={styles.cardDate}>Daily Log: {selectedDaily.date}</Text>
          <Text style={styles.cardMood}>Mood: {getDailyMoodText(selectedDaily)}</Text>
          {selectedDaily.symptoms.length > 0 && (
            <Text style={styles.cardSymptoms}>Symptoms: {selectedDaily.symptoms.join(', ')}</Text>
          )}
          {selectedDaily.notes ? <Text style={styles.cardNotes}>Notes: {selectedDaily.notes}</Text> : null}
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDailyLog(selectedDaily.id)}>
            <Text style={styles.deleteButtonText}>Delete Daily Log</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>All Logged Entries</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'all' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('all')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'all' && styles.filterChipTextActive]}>
              All ({totalCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'cycle' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('cycle')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'cycle' && styles.filterChipTextActive]}>
              Cycle ({cycleCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, historyFilter === 'daily' && styles.filterChipActive]}
            onPress={() => setHistoryFilter('daily')}
          >
            <Text style={[styles.filterChipText, historyFilter === 'daily' && styles.filterChipTextActive]}>
              Daily ({dailyCount})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredHistoryEntries.length === 0 ? (
          <Text style={styles.hintInline}>No entries logged yet.</Text>
        ) : (
          filteredHistoryEntries.map((item) => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              style={styles.historyRow}
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
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <Text style={styles.historyMood} numberOfLines={1}>
                  Mood: {item.type === 'cycle' ? getEntryMoodText(item.entry) : getDailyMoodText(item.entry)}
                </Text>
                {item.entry.symptoms.length > 0 && (
                  <Text style={styles.historySub} numberOfLines={1}>
                    Symptoms: {item.entry.symptoms.join(', ')}
                  </Text>
                )}
              </View>
              <Text style={styles.historyChevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#00695C', marginBottom: 12, textAlign: 'center' },
  calendar: { borderRadius: 12, elevation: 2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 4, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
});
