import { CycleEntry, DailyLogEntry, FertilityForecast, PartnerProfile } from '../types';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';

export interface CyclePhase {
  name: string;
  description: string;
  emoji: string;
  color: string;
  start: string;
  end: string;
}

export interface MonthlyInsights {
  month: string;
  cycleCount: number;
  averageCycleLength: number;
  shortestCycle: number;
  longestCycle: number;
  predictedPhase: string;
  phases: CyclePhase[];
}

export function getCyclePhases(forecast: FertilityForecast | null, lastCycleStart?: string): CyclePhase[] {
  if (!forecast) return [];

  const { nextCycleStart, ovulationDate, fertileWindowStart, fertileWindowEnd } = forecast;
  const cycleStart = lastCycleStart ?? format(new Date(), 'yyyy-MM-dd');

  const phases: CyclePhase[] = [
    {
      name: 'Menstrual',
      description: 'Rest & hydration phase',
      emoji: '🔴',
      color: '#E91E63',
      start: cycleStart,
      end: format(addDays(parseISO(cycleStart), 4), 'yyyy-MM-dd'),
    },
    {
      name: 'Follicular',
      description: 'Energy & growth phase',
      emoji: '🟡',
      color: '#FFC107',
      start: format(addDays(parseISO(cycleStart), 5), 'yyyy-MM-dd'),
      end: format(addDays(parseISO(fertileWindowStart), -1), 'yyyy-MM-dd'),
    },
    {
      name: 'Fertile Window',
      description: 'High fertility window',
      emoji: '🟠',
      color: '#FF9800',
      start: fertileWindowStart,
      end: fertileWindowEnd,
    },
    {
      name: 'Ovulation',
      description: 'Peak fertility day',
      emoji: '⭐',
      color: '#00897B',
      start: ovulationDate,
      end: ovulationDate,
    },
    {
      name: 'Luteal',
      description: 'Stability & introspection',
      emoji: '🔵',
      color: '#3949AB',
      start: format(addDays(parseISO(ovulationDate), 1), 'yyyy-MM-dd'),
      end: format(addDays(parseISO(nextCycleStart), -1), 'yyyy-MM-dd'),
    },
  ];

  return phases;
}

export function getMonthlyInsights(entries: CycleEntry[]): MonthlyInsights[] {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (sorted.length === 0) return [];

  const insights: Map<string, MonthlyInsights> = new Map();
  const monthCycleLengths: Map<string, number[]> = new Map();

  sorted.forEach((entry) => {
    const date = parseISO(entry.startDate);
    const monthKey = format(date, 'yyyy-MM');

    if (!insights.has(monthKey)) {
      insights.set(monthKey, {
        month: format(date, 'MMMM yyyy'),
        cycleCount: 0,
        averageCycleLength: 0,
        shortestCycle: 999,
        longestCycle: 0,
        predictedPhase: 'Unknown',
        phases: [],
      });
    }

    const current = insights.get(monthKey)!;
    current.cycleCount += 1;
  });

  // Calculate cycle lengths for each month
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].startDate);
    const curr = parseISO(sorted[i].startDate);
    const diff = differenceInDays(curr, prev);

    if (diff > 0 && diff < 60) {
      const monthKey = format(curr, 'yyyy-MM');
      if (insights.has(monthKey)) {
        const current = insights.get(monthKey)!;
        const lengths = monthCycleLengths.get(monthKey) ?? [];
        lengths.push(diff);
        monthCycleLengths.set(monthKey, lengths);
        current.shortestCycle = Math.min(current.shortestCycle, diff);
        current.longestCycle = Math.max(current.longestCycle, diff);
      }
    }
  }

  insights.forEach((value, monthKey) => {
    const lengths = monthCycleLengths.get(monthKey) ?? [];
    if (lengths.length === 0) {
      value.shortestCycle = 0;
      value.longestCycle = 0;
      value.averageCycleLength = 0;
      return;
    }
    value.averageCycleLength =
      lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  });

  const result = Array.from(insights.entries())
    .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
    .map(([, insight]) => insight)
    .slice(0, 6);

  return result;
}

export interface ExportData {
  exportDate: string;
  partnerName: string;
  totalEntries: number;
  totalDailyLogs: number;
  averageCycleLength: number;
  entries: CycleEntry[];
  dailyLogs: DailyLogEntry[];
  insights: MonthlyInsights[];
  forecast: FertilityForecast | null;
}

export function generateExportData(
  entries: CycleEntry[],
  dailyLogs: DailyLogEntry[],
  profile: PartnerProfile,
  forecast: FertilityForecast | null
): ExportData {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const cycleLengths: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].startDate);
    const curr = parseISO(sorted[i].startDate);
    const diff = differenceInDays(curr, prev);
    if (diff > 0 && diff < 60) cycleLengths.push(diff);
  }

  return {
    exportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    partnerName: profile.partnerName || 'Partner',
    totalEntries: entries.length,
    totalDailyLogs: dailyLogs.length,
    averageCycleLength: cycleLengths.length > 0
      ? cycleLengths.reduce((sum, len) => sum + len, 0) / cycleLengths.length
      : 0,
    entries,
    dailyLogs,
    insights: getMonthlyInsights(entries),
    forecast,
  };
}

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportToCSV(data: ExportData): string {
  const lines: string[] = [];

  lines.push('Cycle Tracker Export');
  lines.push(`Export Date,${data.exportDate}`);
  lines.push(`Partner Name,${data.partnerName}`);
  lines.push(`Total Entries,${data.totalEntries}`);
  lines.push(`Total Daily Logs,${data.totalDailyLogs}`);
  lines.push(`Average Cycle Length,${data.averageCycleLength.toFixed(1)} days`);
  lines.push('');

  lines.push('Cycle Entries');
  lines.push('Start Date,Moods,Symptoms,Notes');
  data.entries.forEach((entry) => {
    const moodsStr = entry.moods && entry.moods.length > 0
      ? entry.moods.join('; ')
      : entry.mood;
    const symptomsStr = entry.symptoms.join('; ');
    const notesStr = entry.notes.replace(/,/g, ';');
    lines.push(`${entry.startDate},"${moodsStr}","${symptomsStr}","${notesStr}"`);
  });

  if (data.dailyLogs.length > 0) {
    lines.push('');
    lines.push('Daily Logs');
    lines.push('Date,Moods,Symptoms,Notes');
    data.dailyLogs.forEach((entry) => {
      const moodsStr = entry.moods.join('; ');
      const symptomsStr = entry.symptoms.join('; ');
      const notesStr = entry.notes.replace(/,/g, ';');
      lines.push(`${entry.date},"${moodsStr}","${symptomsStr}","${notesStr}"`);
    });
  }

  if (data.insights.length > 0) {
    lines.push('');
    lines.push('Monthly Insights');
    lines.push('Month,Cycle Count,Average Length,Shortest,Longest');
    data.insights.forEach((insight) => {
      lines.push(
        `${insight.month},${insight.cycleCount},${insight.averageCycleLength.toFixed(1)},${insight.shortestCycle},${insight.longestCycle}`
      );
    });
  }

  if (data.forecast) {
    lines.push('');
    lines.push('Fertility Forecast');
    lines.push(`Next Cycle Start,${data.forecast.nextCycleStart}`);
    lines.push(`Ovulation Date,${data.forecast.ovulationDate}`);
    lines.push(`Fertile Window,${data.forecast.fertileWindowStart} to ${data.forecast.fertileWindowEnd}`);
    lines.push(`Average Cycle Length,${data.forecast.averageCycleLength} days`);
  }

  return lines.join('\n');
}
