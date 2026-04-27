import { CycleEntry, FertilityForecast, PartnerProfile } from '../types';
import { format, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

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

export function getCyclePhases(forecast: FertilityForecast | null): CyclePhase[] {
  if (!forecast) return [];

  const { nextCycleStart, ovulationDate, fertileWindowStart, fertileWindowEnd } = forecast;
  const today = format(new Date(), 'yyyy-MM-dd');

  const phases: CyclePhase[] = [
    {
      name: 'Menstrual',
      description: 'Rest & hydration phase',
      emoji: '🔴',
      color: '#E91E63',
      start: today,
      end: addDays(parseISO(today), 4).toISOString().split('T')[0],
    },
    {
      name: 'Follicular',
      description: 'Energy & growth phase',
      emoji: '🟡',
      color: '#FFC107',
      start: addDays(parseISO(today), 5).toISOString().split('T')[0],
      end: addDays(parseISO(fertileWindowStart), -1).toISOString().split('T')[0],
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
      start: addDays(parseISO(ovulationDate), 1).toISOString().split('T')[0],
      end: addDays(parseISO(nextCycleStart), -1).toISOString().split('T')[0],
    },
  ];

  return phases;
}

export function getMonthlyInsights(entries: CycleEntry[]): MonthlyInsights[] {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (sorted.length === 0) return [];

  const insights: Map<string, MonthlyInsights> = new Map();

  sorted.forEach((entry) => {
    const date = parseISO(entry.startDate);
    const monthKey = format(date, 'yyyy-MM');

    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

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
        current.shortestCycle = Math.min(current.shortestCycle, diff);
        current.longestCycle = Math.max(current.longestCycle, diff);
      }
    }
  }

  const result = Array.from(insights.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);

  return result;
}

export interface ExportData {
  exportDate: string;
  partnerName: string;
  totalEntries: number;
  averageCycleLength: number;
  entries: CycleEntry[];
  insights: MonthlyInsights[];
  forecast: FertilityForecast | null;
}

export function generateExportData(
  entries: CycleEntry[],
  profile: PartnerProfile,
  forecast: FertilityForecast | null
): ExportData {
  return {
    exportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    partnerName: profile.partnerName || 'Partner',
    totalEntries: entries.length,
    averageCycleLength: entries.length >= 2
      ? entries.reduce((sum, _, i, arr) => {
          if (i === 0) return 0;
          const prev = parseISO(arr[i - 1].startDate);
          const curr = parseISO(arr[i].startDate);
          return sum + differenceInDays(curr, prev);
        }, 0) / (entries.length - 1)
      : 0,
    entries,
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
  lines.push(`Average Cycle Length,${data.averageCycleLength.toFixed(1)} days`);
  lines.push('');

  lines.push('Cycle Entries');
  lines.push('Start Date,Mood,Symptoms,Notes');
  data.entries.forEach((entry) => {
    const symptomsStr = entry.symptoms.join('; ');
    const notesStr = entry.notes.replace(/,/g, ';');
    lines.push(`${entry.startDate},${entry.mood},"${symptomsStr}","${notesStr}"`);
  });

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
