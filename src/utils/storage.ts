import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, parseISO, format } from 'date-fns';
import {
  CycleEntry,
  DailyLogEntry,
  AVERAGE_CYCLE_LENGTH,
  FertilityForecast,
  PartnerProfile,
  AppColors,
} from '../types';

const STORAGE_KEY = 'cycle_entries';
const DAILY_LOGS_KEY = 'daily_logs';
const PROFILE_KEY = 'partner_profile';
const SUPPORT_ACTIONS_PREFIX = 'support_actions_';
const APP_COLORS_KEY = 'app_colors';

export const DEFAULT_PARTNER_PROFILE: PartnerProfile = {
  partnerName: '',
  tryingToConceive: false,
  averagePeriodLength: 5,
  partnerPreferences: [],
  pregnancyMode: false,
};

export const DEFAULT_APP_COLORS: AppColors = {
  primary: '#00695C',
  secondary: '#00897B',
  background: '#F4F9F8',
  card: '#FFFFFF',
  text: '#333333',
  muted: '#888888',
};

function normalizeHexColor(value: string, fallback: string): string {
  const cleaned = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned.toUpperCase();
  return fallback;
}

export async function getCycleEntries(): Promise<CycleEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CycleEntry[];
}

export async function saveCycleEntry(entry: CycleEntry): Promise<void> {
  const entries = await getCycleEntries();
  const existing = entries.findIndex((e) => e.id === entry.id);
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }
  entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function deleteCycleEntry(id: string): Promise<void> {
  const entries = await getCycleEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export async function getDailyLogEntries(): Promise<DailyLogEntry[]> {
  const raw = await AsyncStorage.getItem(DAILY_LOGS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as DailyLogEntry[];
}

export async function saveDailyLogEntry(entry: DailyLogEntry): Promise<void> {
  const entries = await getDailyLogEntries();
  const existing = entries.findIndex((e) => e.id === entry.id);
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(entries));
}

export async function deleteDailyLogEntry(id: string): Promise<void> {
  const entries = await getDailyLogEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(filtered));
}

export async function getPartnerProfile(): Promise<PartnerProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return DEFAULT_PARTNER_PROFILE;
  return { ...DEFAULT_PARTNER_PROFILE, ...(JSON.parse(raw) as Partial<PartnerProfile>) };
}

export async function savePartnerProfile(profile: PartnerProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getAppColors(): Promise<AppColors> {
  const raw = await AsyncStorage.getItem(APP_COLORS_KEY);
  if (!raw) return DEFAULT_APP_COLORS;

  const parsed = JSON.parse(raw) as Partial<AppColors>;
  return {
    primary: normalizeHexColor(parsed.primary ?? '', DEFAULT_APP_COLORS.primary),
    secondary: normalizeHexColor(parsed.secondary ?? '', DEFAULT_APP_COLORS.secondary),
    background: normalizeHexColor(parsed.background ?? '', DEFAULT_APP_COLORS.background),
    card: normalizeHexColor(parsed.card ?? '', DEFAULT_APP_COLORS.card),
    text: normalizeHexColor(parsed.text ?? '', DEFAULT_APP_COLORS.text),
    muted: normalizeHexColor(parsed.muted ?? '', DEFAULT_APP_COLORS.muted),
  };
}

export async function saveAppColors(colors: AppColors): Promise<void> {
  const safeColors: AppColors = {
    primary: normalizeHexColor(colors.primary, DEFAULT_APP_COLORS.primary),
    secondary: normalizeHexColor(colors.secondary, DEFAULT_APP_COLORS.secondary),
    background: normalizeHexColor(colors.background, DEFAULT_APP_COLORS.background),
    card: normalizeHexColor(colors.card, DEFAULT_APP_COLORS.card),
    text: normalizeHexColor(colors.text, DEFAULT_APP_COLORS.text),
    muted: normalizeHexColor(colors.muted, DEFAULT_APP_COLORS.muted),
  };
  await AsyncStorage.setItem(APP_COLORS_KEY, JSON.stringify(safeColors));
}

function getSupportActionsKey(date: string): string {
  return `${SUPPORT_ACTIONS_PREFIX}${date}`;
}

export async function getSupportActionsForDate(date: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(getSupportActionsKey(date));
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export async function saveSupportActionsForDate(date: string, actions: string[]): Promise<void> {
  await AsyncStorage.setItem(getSupportActionsKey(date), JSON.stringify(actions));
}

export function getAverageCycleLength(entries: CycleEntry[]): number {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (sorted.length < 2) return AVERAGE_CYCLE_LENGTH;

  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].startDate);
    const curr = parseISO(sorted[i].startDate);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff < 60) lengths.push(diff);
  }

  if (lengths.length === 0) return AVERAGE_CYCLE_LENGTH;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

export function predictNextCycle(entries: CycleEntry[]): string | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const avgLength = getAverageCycleLength(sorted);

  const lastDate = parseISO(sorted[sorted.length - 1].startDate);
  return format(addDays(lastDate, avgLength), 'yyyy-MM-dd');
}

export function predictFertilityWindow(entries: CycleEntry[]): FertilityForecast | null {
  const nextCycleStart = predictNextCycle(entries);
  if (!nextCycleStart) return null;

  const averageCycleLength = getAverageCycleLength(entries);
  const nextCycleDate = parseISO(nextCycleStart);

  // Ovulation is typically around 14 days before the next cycle start.
  const ovulationDate = format(addDays(nextCycleDate, -14), 'yyyy-MM-dd');
  const fertileWindowStart = format(addDays(parseISO(ovulationDate), -5), 'yyyy-MM-dd');
  const fertileWindowEnd = format(addDays(parseISO(ovulationDate), 1), 'yyyy-MM-dd');

  return {
    nextCycleStart,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    averageCycleLength,
  };
}

export function getRecentCycleLengths(entries: CycleEntry[]): number[] {
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const lengths: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1].startDate);
    const curr = parseISO(sorted[i].startDate);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff < 60) lengths.push(diff);
  }

  return lengths.slice(-6);
}

export function getRegularityScore(entries: CycleEntry[]): number {
  const lengths = getRecentCycleLengths(entries);
  if (lengths.length < 2) return 70;

  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Smaller variation in cycle length means higher regularity.
  const score = Math.max(20, Math.min(98, Math.round(100 - stdDev * 10)));
  return score;
}

export function getDailySupportTip(
  date: string,
  forecast: FertilityForecast | null,
  profile: PartnerProfile
): string {
  if (profile.pregnancyMode) {
    return 'Pregnancy mode is on. Prioritize rest, hydration, comfort, and gentle reassurance.';
  }

  if (!forecast) return 'Log at least two cycle start dates to unlock personalized guidance.';

  const today = parseISO(date);
  const fertileStart = parseISO(forecast.fertileWindowStart);
  const fertileEnd = parseISO(forecast.fertileWindowEnd);
  const ovulation = parseISO(forecast.ovulationDate);
  const nextCycle = parseISO(forecast.nextCycleStart);

  if (today >= fertileStart && today <= fertileEnd) {
    if (profile.tryingToConceive) {
      return 'Fertile window is active. Prioritize rest, hydration, and low-stress time together.';
    }
    return 'Fertile window is active. Keep communication open and support daily comfort habits.';
  }

  if (format(today, 'yyyy-MM-dd') === format(ovulation, 'yyyy-MM-dd')) {
    return 'Likely ovulation day. Be extra supportive and keep the day low-stress.';
  }

  const daysToNext = Math.round((nextCycle.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToNext >= 0 && daysToNext <= 3) {
    return 'Cycle may start soon. Prep comfort items, snacks, and check in emotionally.';
  }

  return 'Stable phase: focus on healthy routines, sleep, and supportive check-ins.';
}

export function getMarkedDates(
  entries: CycleEntry[],
  avgPeriodLength = 5,
): Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string; predicted?: boolean }> {
  const marked: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string; predicted?: boolean }> = {};
  entries.forEach((entry) => {
    const confirmedEnd = entry.endDate ? parseISO(entry.endDate) : parseISO(entry.startDate);
    const predictedEnd = addDays(parseISO(entry.startDate), avgPeriodLength - 1);

    // Mark confirmed days (startDate → endDate)
    try {
      let cursor = parseISO(entry.startDate);
      while (cursor <= confirmedEnd) {
        const key = format(cursor, 'yyyy-MM-dd');
        marked[key] = { marked: true, dotColor: '#E91E63' };
        cursor = addDays(cursor, 1);
      }
    } catch { /* skip invalid */ }

    // Mark predicted remaining days (endDate+1 → predictedEnd) as faded
    try {
      let cursor = addDays(confirmedEnd, 1);
      while (cursor <= predictedEnd) {
        const key = format(cursor, 'yyyy-MM-dd');
        if (!marked[key]) {
          marked[key] = { marked: true, dotColor: '#E91E6355', predicted: true };
        }
        cursor = addDays(cursor, 1);
      }
    } catch { /* skip invalid */ }
  });
  return marked;
}
