import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { format } from 'date-fns';
import {
  getCycleEntries,
  getPartnerProfile,
  predictFertilityWindow,
} from '../utils/storage';
import {
  getMonthlyInsights,
  getCyclePhases,
  generateExportData,
  exportToJSON,
  exportToCSV,
  MonthlyInsights,
  CyclePhase,
} from '../utils/insights';

export default function InsightsScreen() {
  const [monthlyInsights, setMonthlyInsights] = useState<MonthlyInsights[]>([]);
  const [phases, setPhases] = useState<CyclePhase[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyInsights | null>(null);

  const load = useCallback(async () => {
    const entries = await getCycleEntries();
    const profile = await getPartnerProfile();
    const forecast = predictFertilityWindow(entries);
    const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const lastCycleStart = sorted.length > 0 ? sorted[sorted.length - 1].startDate : undefined;

    const insights = getMonthlyInsights(entries);
    setMonthlyInsights(insights);
    setPhases(getCyclePhases(forecast, lastCycleStart));

    if (insights.length > 0) {
      setSelectedMonth(insights[0]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (format: 'json' | 'csv') => {
    const entries = await getCycleEntries();
    const profile = await getPartnerProfile();
    const forecast = predictFertilityWindow(entries);

    const data = generateExportData(entries, profile, forecast);
    const content = format === 'json' ? exportToJSON(data) : exportToCSV(data);
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `cycle-tracker-export-${new Date().toISOString().split('T')[0]}.${format}`;

    try {
      await Share.share({
        message: content,
        title: filename,
        url: undefined,
      });
    } catch (error) {
      Alert.alert('Export failed', 'Could not export data.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Insights & Analytics</Text>

      {monthlyInsights.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Log at least 2 cycle start dates to unlock insights and analytics.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Monthly Patterns</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.monthScroll}
            >
              {monthlyInsights.map((insight, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthButton,
                    selectedMonth?.month === insight.month && styles.monthButtonActive,
                  ]}
                  onPress={() => setSelectedMonth(insight)}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      selectedMonth?.month === insight.month && styles.monthButtonTextActive,
                    ]}
                  >
                    {insight.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedMonth && (
              <View style={styles.monthDetails}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Cycles Logged</Text>
                  <Text style={styles.statValue}>{selectedMonth.cycleCount}</Text>
                </View>
                {selectedMonth.shortestCycle !== 999 && (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Shortest Cycle</Text>
                      <Text style={styles.statValue}>{selectedMonth.shortestCycle} days</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Longest Cycle</Text>
                      <Text style={styles.statValue}>{selectedMonth.longestCycle} days</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Current Cycle Phases</Text>
            {phases.length > 0 ? (
              phases.map((phase, index) => (
                <View key={index} style={styles.phaseCard}>
                  <View style={styles.phaseHeader}>
                    <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                    <View style={styles.phaseMeta}>
                      <Text style={styles.phaseName}>{phase.name}</Text>
                      <Text style={styles.phaseDate}>
                        {phase.start} → {phase.end}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.phaseDesc}>{phase.description}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.hint}>No forecast available yet.</Text>
            )}
          </View>
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Export & Share</Text>
        <Text style={styles.helperText}>
          Export your cycle data as a privacy-safe summary for sharing or backup.
        </Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('json')}
        >
          <Text style={styles.exportButtonText}>📋 Export as JSON</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportButton, styles.exportButtonSecondary]}
          onPress={() => handleExport('csv')}
        >
          <Text style={styles.exportButtonText}>📊 Export as CSV</Text>
        </TouchableOpacity>

        <Text style={[styles.helperText, { marginTop: 12, fontSize: 12 }]}>
          Data remains on your device. Exports are for personal backup and sharing only.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#00695C', marginBottom: 20, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  hint: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22 },
  helperText: { fontSize: 13, color: '#888', marginBottom: 8 },
  monthScroll: { marginBottom: 12 },
  monthButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  monthButtonActive: { borderColor: '#00695C', backgroundColor: '#F4F9F8' },
  monthButtonText: { fontSize: 12, color: '#666' },
  monthButtonTextActive: { color: '#00695C', fontWeight: '700' },
  monthDetails: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statLabel: { fontSize: 13, color: '#666' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#333' },
  phaseCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3949AB',
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  phaseEmoji: { fontSize: 24, marginRight: 12 },
  phaseMeta: { flex: 1 },
  phaseName: { fontSize: 14, fontWeight: '700', color: '#333' },
  phaseDate: { fontSize: 12, color: '#888', marginTop: 2 },
  phaseDesc: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  exportButton: {
    backgroundColor: '#00695C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  exportButtonSecondary: { backgroundColor: '#00897B' },
  exportButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
