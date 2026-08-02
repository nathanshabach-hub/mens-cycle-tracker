export interface CycleEntry {
  id: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate?: string; // optional confirmed cycle end date
  symptoms: string[];
  mood: string; // legacy single mood value
  moods?: string[]; // optional multi-select moods for newer entries
  notes: string;
}

export interface DailyLogEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  moods: string[];
  symptoms: string[];
  notes: string;
  ovulationTestResult?: 'Positive' | 'Negative'; // Tracking hormone tests
  pregnancyTestResult?: 'Positive' | 'Negative'; // Tracking pregnancy tests
  intimacyLogged?: boolean; // Added for intimacy tracking
  protectionUsed?: boolean; // Optional protection status flag
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
  partnerPreferences: string[];
  pregnancyMode?: boolean; // Added to support toggling pregnancy view mode
}

export type MoodOption =
  // Positive / high-energy (follicular & ovulation phases)
  | 'Happy'
  | 'Energetic'
  | 'Confident'
  | 'Motivated'
  | 'Calm'
  // Neutral
  | 'Neutral'
  // Negative / low-energy (luteal & menstrual phases — PMS/PMDD criteria)
  | 'Irritable'
  | 'Angry'
  | 'Tense'
  | 'Anxious'
  | 'Overwhelmed'
  | 'Sensitive'
  | 'Sad'
  | 'Tearful'
  | 'Depressed'
  | 'Withdrawn';

export const MOOD_OPTIONS: MoodOption[] = [
  // Positive
  'Happy', 'Energetic', 'Confident', 'Motivated', 'Calm',
  // Neutral
  'Neutral',
  // Negative
  'Irritable', 'Angry', 'Tense', 'Anxious', 'Overwhelmed',
  'Sensitive', 'Sad', 'Tearful', 'Depressed', 'Withdrawn',
];

export const SYMPTOM_OPTIONS = [
  'Cramps',
  'Bloating',
  'Headache',
  'Migraine',
  'Fatigue',
  'Low Energy',
  'Back Pain',
  'Pelvic Pain',
  'Breast Tenderness',
  'Breast Fullness',
  'Nausea',
  'Digestive Upset',
  'Constipation',
  'Diarrhea',
  'Gas',
  'Food Cravings',
  'Increased Appetite',
  'Reduced Appetite',
  'Acne',
  'Oily Skin',
  'Dry Skin',
  'Water Retention',
  'Sleep Changes',
  'Insomnia',
  'Anxiety',
  'Irritability',
  'Mood Swings',
  'Low Mood',
  'Stress',
  'Brain Fog',
  'Dizziness',
  'Hot Flashes',
  'Chills',
  'Increased Discharge',
  'Ovulation Pain',
  'Spotting',
  'Heavy Flow',
  'Light Flow',
];

export const AVERAGE_CYCLE_LENGTH = 28; // days

export const SUPPORT_ACTION_OPTIONS = [
  'Hydration reminder',
  'Rest and comfort check-in',
  'Meal/snack prep',
  'Pain relief supplies ready',
  'Emotional support check-in',
];
