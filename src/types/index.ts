export interface CycleEntry {
  id: string;
  startDate: string; // ISO date string YYYY-MM-DD
  symptoms: string[];
  mood: string;
  notes: string;
}

export interface FertilityForecast {
  nextCycleStart: string;
  ovulationDate: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  averageCycleLength: number;
}

export interface PartnerProfile {
  partnerName: string;
  tryingToConceive: boolean;
  averagePeriodLength: number;
}

export type MoodOption = 'Happy' | 'Neutral' | 'Irritable' | 'Sad' | 'Anxious' | 'Energetic';

export const MOOD_OPTIONS: MoodOption[] = [
  'Happy', 'Neutral', 'Irritable', 'Sad', 'Anxious', 'Energetic',
];

export const SYMPTOM_OPTIONS = [
  'Cramps', 'Bloating', 'Headache', 'Fatigue', 'Back Pain',
  'Mood Swings', 'Tender Breasts', 'Nausea',
];

export const AVERAGE_CYCLE_LENGTH = 28; // days

export const SUPPORT_ACTION_OPTIONS = [
  'Hydration reminder',
  'Rest and comfort check-in',
  'Meal/snack prep',
  'Pain relief supplies ready',
  'Emotional support check-in',
];
