import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  getCycleEntries,
  getPartnerProfile,
  predictFertilityWindow,
} from '../utils/storage';
import { DEFAULT_APP_COLORS } from '../utils/storage';
import {
  getMonthlyInsights,
  getCyclePhases,
  MonthlyInsights,
  CyclePhase,
} from '../utils/insights';
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

export default function InsightsScreen() {
  const { colors, setColors } = useAppTheme();
  const borderSoft = `${colors.muted}33`;
  const [monthlyInsights, setMonthlyInsights] = useState<MonthlyInsights[]>([]);
  const [phases, setPhases] = useState<CyclePhase[]>([]);
  const [pregnancyMode, setPregnancyMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyInsights | null>(null);

  const isDarkMode =
    colors.background.toUpperCase() === DARK_THEME_COLORS.background &&
    colors.card.toUpperCase() === DARK_THEME_COLORS.card;

  const load = useCallback(async () => {
    const entries = await getCycleEntries();
    const profile = await getPartnerProfile();
    const forecast = predictFertilityWindow(entries);
    const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const lastCycleStart = sorted.length > 0 ? sorted[sorted.length - 1].startDate : undefined;

    const insights = getMonthlyInsights(entries);
    setMonthlyInsights(insights);
    setPregnancyMode(profile.pregnancyMode ?? false);
    setPhases(getCyclePhases(forecast, lastCycleStart));

    if (insights.length > 0) {
      setSelectedMonth(insights[0]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleDarkMode = async (enabled: boolean) => {
    if (enabled) {
      await setColors(DARK_THEME_COLORS);
      return;
    }
    await setColors(DEFAULT_APP_COLORS);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.title, { color: colors.primary }]}>Insights & Analytics</Text>
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

      {pregnancyMode && (
        <View style={[styles.pregnancyBanner, { backgroundColor: colors.background, borderColor: colors.secondary }]}>
          <Text style={[styles.pregnancyBannerText, { color: colors.text }]}>Pregnancy mode is on — support and comfort insights are shown instead of fertility planning.</Text>
        </View>
      )}

      {monthlyInsights.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Log at least 2 cycle start dates to unlock insights and analytics.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Patterns</Text>
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
                    { backgroundColor: colors.card, borderColor: borderSoft },
                    selectedMonth?.month === insight.month && styles.monthButtonActive,
                    selectedMonth?.month === insight.month && { borderColor: colors.primary, backgroundColor: colors.background },
                  ]}
                  onPress={() => setSelectedMonth(insight)}
                >
                  <Text
                    style={[
                      styles.monthButtonText,
                      { color: colors.muted },
                      selectedMonth?.month === insight.month && styles.monthButtonTextActive,
                      selectedMonth?.month === insight.month && { color: colors.primary },
                    ]}
                  >
                    {insight.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedMonth && (
              <View style={[styles.monthDetails, { borderTopColor: borderSoft }]}>
                <View style={[styles.statRow, { borderBottomColor: borderSoft }]}> 
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Cycles Logged</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{selectedMonth.cycleCount}</Text>
                </View>
                {selectedMonth.shortestCycle !== 999 && (
                  <>
                    <View style={[styles.statRow, { borderBottomColor: borderSoft }]}> 
                      <Text style={[styles.statLabel, { color: colors.muted }]}>Shortest Cycle</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{selectedMonth.shortestCycle} days</Text>
                    </View>
                    <View style={[styles.statRow, { borderBottomColor: borderSoft }]}> 
                      <Text style={[styles.statLabel, { color: colors.muted }]}>Longest Cycle</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{selectedMonth.longestCycle} days</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Cycle Phases</Text>
            {phases.length > 0 ? (
              phases.map((phase, index) => (
                <View key={index} style={[styles.phaseCard, { backgroundColor: colors.background, borderLeftColor: colors.secondary }]}>
                  <View style={styles.phaseHeader}>
                    <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                    <View style={styles.phaseMeta}>
                      <Text style={[styles.phaseName, { color: colors.text }]}>{phase.name}</Text>
                      <Text style={[styles.phaseDate, { color: colors.muted }]}>
                        {phase.start} → {phase.end}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.phaseDesc, { color: colors.muted }]}>{phase.description}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.hint, { color: colors.muted }]}>No forecast available yet.</Text>
            )}
          </View>
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSpacer: { width: 58 },
  title: { flex: 1, fontSize: 26, fontWeight: '700', color: '#00695C', textAlign: 'center' },
  headerDarkModeControl: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  darkModeIcon: { fontSize: 16 },
  darkModeSwitch: { transform: [{ scale: 0.85 }] },
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
  pregnancyBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  pregnancyBannerText: { fontSize: 13, lineHeight: 20 },
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
});
