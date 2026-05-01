import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { addDays, format, parseISO } from 'date-fns';
import {
  getCycleEntries,
  getMarkedDates,
  deleteCycleEntry,
  predictFertilityWindow,
} from '../utils/storage';
import { CycleEntry } from '../types';

export default function CalendarScreen() {
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [selected, setSelected] = useState<CycleEntry | null>(null);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    const data = await getCycleEntries();
    setEntries(data);
    const marks = getMarkedDates(data);
    const forecast = predictFertilityWindow(data);
    if (forecast) {
      marks[forecast.nextCycleStart] = {
        marked: true,
        dotColor: '#9C27B0',
        selected: true,
        selectedColor: '#CE93D8',
      };

      let cursor = parseISO(forecast.fertileWindowStart);
      const fertileEnd = parseISO(forecast.fertileWindowEnd);
      while (cursor <= fertileEnd) {
        const key = format(cursor, 'yyyy-MM-dd');
        marks[key] = {
          marked: true,
          dotColor: '#FB8C00',
          selected: true,
          selectedColor: '#FFE0B2',
        };
        cursor = addDays(cursor, 1);
      }

      marks[forecast.ovulationDate] = {
        marked: true,
        dotColor: '#00897B',
        selected: true,
        selectedColor: '#80CBC4',
      };
    }
    setMarkedDates(marks);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDayPress = (day: { dateString: string }) => {
    const entry = entries.find((e) => e.startDate === day.dateString);
    setSelected(entry ?? null);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cycle History</Text>

      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#F48FB1',
          selectedDayBackgroundColor: '#F48FB1',
          arrowColor: '#F48FB1',
          dotColor: '#F48FB1',
        }}
        style={styles.calendar}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#F48FB1' }]} />
          <Text style={styles.legendText}>Cycle Start</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#CE93D8' }]} />
          <Text style={styles.legendText}>Predicted Next</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#FFE0B2' }]} />
          <Text style={styles.legendText}>Fertile Window</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#80CBC4' }]} />
          <Text style={styles.legendText}>Ovulation Day</Text>
        </View>
      </View>

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardDate}>{selected.startDate}</Text>
          <Text style={styles.cardMood}>Mood: {selected.mood}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A237E', marginBottom: 12, textAlign: 'center' },
  calendar: { borderRadius: 12, elevation: 2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 4, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#666' },
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
});
