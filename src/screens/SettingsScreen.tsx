import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  getCycleEntries,
  predictFertilityWindow,
  getPartnerProfile,
  savePartnerProfile,
  DEFAULT_APP_COLORS,
  getSupportActionsForDate,
  saveSupportActionsForDate,
} from '../utils/storage';
import { subDays, parseISO, format } from 'date-fns';
import { SUPPORT_ACTION_OPTIONS, AppColors } from '../types';
import { COLOR_PRESETS, useAppTheme } from '../theme/AppThemeContext';

const DARK_THEME_COLORS: AppColors = {
  primary: '#7DD3FC',
  secondary: '#22D3EE',
  background: '#0F172A',
  card: '#1E293B',
  text: '#E2E8F0',
  muted: '#94A3B8',
};

const COLOR_FIELDS: Array<[keyof AppColors, string]> = [
  ['primary', 'Primary'],
  ['secondary', 'Secondary'],
  ['background', 'Background'],
  ['card', 'Card'],
  ['text', 'Text'],
  ['muted', 'Muted'],
];

type SectionKey = 'profile' | 'preferences' | 'colors' | 'reminders' | 'support' | 'about';

type HSVColor = {
  h: number;
  s: number;
  v: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function componentToHex(value: number): string {
  const hex = Math.round(value).toString(16).toUpperCase();
  return hex.length === 1 ? `0${hex}` : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const safe = isValidHexColor(hex) ? hex.trim().toUpperCase() : '#000000';
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
}

function rgbToHsv(r: number, g: number, b: number): HSVColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === rn) h = ((gn - bn) / diff) % 6;
    else if (max === gn) h = (bn - rn) / diff + 2;
    else h = (rn - gn) / diff + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : diff / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function hexToHsv(hex: string): HSVColor {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}

function hsvToHex(hsv: HSVColor): string {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(r, g, b);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleReminder(dateString: string, daysBefore: number, label: string) {
  const triggerDate = subDays(parseISO(dateString), daysBefore);
  if (triggerDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Cycle Reminder",
      body: `${label} — predicted cycle around ${dateString}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export default function SettingsScreen() {
  const { colors, setColors, resetColors } = useAppTheme();
  const [remind3Days, setRemind3Days] = useState(false);
  const [remind1Day, setRemind1Day] = useState(false);
  const [nextCycle, setNextCycle] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [tryingToConceive, setTryingToConceive] = useState(false);
  const [pregnancyMode, setPregnancyMode] = useState(false);
  const [averagePeriodLength, setAveragePeriodLength] = useState('5');
  const [todayActions, setTodayActions] = useState<string[]>([]);
  const [partnerPreferences, setPartnerPreferences] = useState<string[]>([]);
  const [newPreference, setNewPreference] = useState('');
  const [themeInputs, setThemeInputs] = useState<AppColors>(colors);
  const [selectedColorKey, setSelectedColorKey] = useState<keyof AppColors>('primary');
  const [selectedHSV, setSelectedHSV] = useState<HSVColor>(() => hexToHsv(colors.primary));
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    profile: true,
    preferences: false,
    colors: false,
    reminders: false,
    support: false,
    about: false,
  });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const isDarkMode =
    colors.background.toUpperCase() === DARK_THEME_COLORS.background &&
    colors.card.toUpperCase() === DARK_THEME_COLORS.card;

  const load = useCallback(async () => {
    const entries = await getCycleEntries();
    const forecast = predictFertilityWindow(entries);
    const profile = await getPartnerProfile();
    const today = format(new Date(), 'yyyy-MM-dd');
    const actions = await getSupportActionsForDate(today);

    setNextCycle(forecast?.nextCycleStart ?? null);
    setPartnerName(profile.partnerName);
    setTryingToConceive(profile.tryingToConceive);
    setPregnancyMode(profile.pregnancyMode ?? false);
    setAveragePeriodLength(String(profile.averagePeriodLength));
    setTodayActions(actions);
    setPartnerPreferences(profile.partnerPreferences ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setThemeInputs(colors);
  }, [colors]);

  useEffect(() => {
    setSelectedHSV(hexToHsv(themeInputs[selectedColorKey]));
  }, [selectedColorKey, themeInputs]);

  const handleThemeInputChange = (key: keyof AppColors, value: string) => {
    const normalized = value.toUpperCase();
    setThemeInputs((prev) => ({
      ...prev,
      [key]: normalized,
    }));

    if (key === selectedColorKey && isValidHexColor(normalized)) {
      setSelectedHSV(hexToHsv(normalized));
    }
  };

  const handleSelectColorKey = (key: keyof AppColors) => {
    setSelectedColorKey(key);
    setSelectedHSV(hexToHsv(themeInputs[key]));
  };

  const handleSliderChange = (channel: 'h' | 's' | 'v', value: number) => {
    setSelectedHSV((prev) => {
      const next: HSVColor = {
        ...prev,
        [channel]: channel === 'h' ? value : clamp01(value),
      };

      const nextHex = hsvToHex(next);
      setThemeInputs((existing) => ({
        ...existing,
        [selectedColorKey]: nextHex,
      }));

      return next;
    });
  };

  const buildValidatedTheme = (): AppColors | null => {
    const keys: Array<keyof AppColors> = ['primary', 'secondary', 'background', 'card', 'text', 'muted'];
    const next: AppColors = { ...themeInputs };

    for (const key of keys) {
      const value = themeInputs[key].trim();
      if (!isValidHexColor(value)) {
        Alert.alert('Invalid color', `Use HEX format like #1A2B3C for ${key}.`);
        return null;
      }
      next[key] = value.toUpperCase();
    }

    return next;
  };

  const handleApplyTheme = async () => {
    const validated = buildValidatedTheme();
    if (!validated) return;
    await setColors(validated);
    Alert.alert('Saved', 'App colors updated.');
  };

  const handlePreset = async (preset: AppColors) => {
    setThemeInputs(preset);
    await setColors(preset);
  };

  const handleResetTheme = async () => {
    await resetColors();
    setThemeInputs(DEFAULT_APP_COLORS);
    Alert.alert('Reset', 'Theme colors restored to default.');
  };

  const handleToggleDarkMode = async (enabled: boolean) => {
    if (enabled) {
      await setColors(DARK_THEME_COLORS);
      setThemeInputs(DARK_THEME_COLORS);
      return;
    }
    await setColors(DEFAULT_APP_COLORS);
    setThemeInputs(DEFAULT_APP_COLORS);
  };

  const handleToggle3Days = async (value: boolean) => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Permission required', 'Enable notifications in device settings.');
      return;
    }
    setRemind3Days(value);
    await cancelAllReminders();
    if (nextCycle) {
      if (value) await scheduleReminder(nextCycle, 3, '3 days before cycle');
      if (remind1Day && nextCycle) await scheduleReminder(nextCycle, 1, '1 day before cycle');
    }
  };

  const handleToggle1Day = async (value: boolean) => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Permission required', 'Enable notifications in device settings.');
      return;
    }
    setRemind1Day(value);
    await cancelAllReminders();
    if (nextCycle) {
      if (remind3Days) await scheduleReminder(nextCycle, 3, '3 days before cycle');
      if (value) await scheduleReminder(nextCycle, 1, '1 day before cycle');
    }
  };

  const handleSaveProfile = async () => {
    const periodLengthNum = Number(averagePeriodLength);
    if (Number.isNaN(periodLengthNum) || periodLengthNum < 2 || periodLengthNum > 10) {
      Alert.alert('Invalid period length', 'Please enter a value between 2 and 10 days.');
      return;
    }

    await savePartnerProfile({
      partnerName: partnerName.trim(),
      tryingToConceive,
      pregnancyMode,
      averagePeriodLength: periodLengthNum,
      partnerPreferences,
    });
    Alert.alert('Saved', 'Partner profile updated successfully.');
  };

  const handleTogglePregnancyMode = async (value: boolean) => {
    const nextValue = value;
    setPregnancyMode(nextValue);

    const profile = await getPartnerProfile();
    const parsedPeriodLength = Number(averagePeriodLength);
    const safeAveragePeriodLength = Number.isFinite(parsedPeriodLength) && parsedPeriodLength > 0
      ? parsedPeriodLength
      : profile.averagePeriodLength ?? 5;

    await savePartnerProfile({
      partnerName: partnerName.trim(),
      tryingToConceive,
      pregnancyMode: nextValue,
      averagePeriodLength: safeAveragePeriodLength,
      partnerPreferences,
    });
  };

  const handleAddPreference = async () => {
    const trimmed = newPreference.trim();
    if (!trimmed) return;
    if (partnerPreferences.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase())) return;
    const updated = [...partnerPreferences, trimmed];
    setPartnerPreferences(updated);
    setNewPreference('');
    const profile = await getPartnerProfile();
    await savePartnerProfile({ ...profile, partnerPreferences: updated });
  };

  const handleRemovePreference = async (item: string) => {
    const updated = partnerPreferences.filter((p) => p !== item);
    setPartnerPreferences(updated);
    const profile = await getPartnerProfile();
    await savePartnerProfile({ ...profile, partnerPreferences: updated });
  };

  const handleToggleAction = async (action: string) => {
    const nextActions = todayActions.includes(action)
      ? todayActions.filter((item) => item !== action)
      : [...todayActions, action];

    setTodayActions(nextActions);
    await saveSupportActionsForDate(format(new Date(), 'yyyy-MM-dd'), nextActions);
  };

  const toggleSection = (key: SectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderAccordionHeader = (key: SectionKey, title: string) => (
    <TouchableOpacity
      onPress={() => toggleSection(key)}
      style={[styles.accordionHeader, { borderBottomColor: colors.muted + '33' }]}
      activeOpacity={0.8}
    >
      <Text style={[styles.sectionTitle, styles.sectionTitleCompact, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.accordionIcon, { color: colors.primary }]}>{expandedSections[key] ? '−' : '+'}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.primary }]}>Settings</Text>
        <View style={styles.headerDarkModeControl}>
          <Text style={[styles.darkModeIcon, { color: colors.primary }]}>🌙</Text>
          <Switch
            value={isDarkMode}
            onValueChange={handleToggleDarkMode}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {renderAccordionHeader('profile', 'Partner Profile')}
        {expandedSections.profile && (
          <>
            <Text style={[styles.inputLabel, { color: colors.muted }]}>Partner name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.muted, color: colors.text, backgroundColor: colors.card }]}
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Average period length (days)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.muted, color: colors.text, backgroundColor: colors.card }]}
              value={averagePeriodLength}
              onChangeText={setAveragePeriodLength}
              keyboardType="number-pad"
              maxLength={2}
              placeholderTextColor={colors.muted}
            />

            <View style={[styles.row, { borderTopColor: colors.muted + '33' }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Trying to conceive</Text>
              <Switch
                value={tryingToConceive}
                onValueChange={setTryingToConceive}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={[styles.row, { borderTopColor: colors.muted + '33' }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Pregnancy mode</Text>
              <Switch
                value={pregnancyMode}
                onValueChange={handleTogglePregnancyMode}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {renderAccordionHeader('preferences', 'Partner Preferences')}
        {expandedSections.preferences && (
          <>
            <Text style={[styles.sub, { color: colors.muted }]}> 
              Things that help her — you'll be reminded to check these during key phases.
            </Text>

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, styles.prefInput, { borderColor: colors.muted, color: colors.text, backgroundColor: colors.card }]}
                value={newPreference}
                onChangeText={setNewPreference}
                placeholder="e.g. chocolate, heat pack, quiet time"
                placeholderTextColor={colors.muted}
                maxLength={40}
                onSubmitEditing={handleAddPreference}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleAddPreference}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {partnerPreferences.length === 0 && (
              <Text style={[styles.emptyPref, { color: colors.muted }]}>No preferences added yet.</Text>
            )}
            {partnerPreferences.map((item) => (
              <View key={item} style={[styles.prefItem, { borderTopColor: colors.muted + '33' }]}>
                <Text style={[styles.prefText, { color: colors.text }]}>{item}</Text>
                <TouchableOpacity onPress={() => handleRemovePreference(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.prefRemove, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {renderAccordionHeader('colors', 'App Colors')}
        {expandedSections.colors && (
          <>
            <Text style={[styles.sub, { color: colors.muted }]}>Pick colors with sliders, or fine-tune with HEX if you want.</Text>

            <View style={styles.paletteRow}>
              {COLOR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  style={[styles.presetChip, { borderColor: preset.colors.primary }]}
                  onPress={() => handlePreset(preset.colors)}
                >
                  <View style={[styles.presetDot, { backgroundColor: preset.colors.primary }]} />
                  <Text style={[styles.presetText, { color: colors.text }]}>{preset.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {COLOR_FIELDS.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.colorRow,
                  styles.colorRowTouchable,
                  { borderColor: colors.muted + '55', backgroundColor: colors.card },
                  selectedColorKey === key && { borderColor: colors.primary },
                ]}
                onPress={() => handleSelectColorKey(key)}
                activeOpacity={0.85}
              >
                <View style={[styles.colorPreview, { backgroundColor: themeInputs[key] }]} />
                <View style={styles.colorInputWrap}>
                  <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.muted, color: colors.text, backgroundColor: colors.card }]}
                    value={themeInputs[key]}
                    onChangeText={(value) => handleThemeInputChange(key, value)}
                    onFocus={() => handleSelectColorKey(key)}
                    placeholder="#000000"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                </View>
              </TouchableOpacity>
            ))}

            <View style={[styles.sliderPanel, { backgroundColor: colors.background, borderColor: colors.muted + '33' }]}>
              <View style={styles.sliderHeader}>
                <View style={[styles.sliderPreview, { backgroundColor: themeInputs[selectedColorKey], borderColor: colors.muted + '55' }]} />
                <View style={styles.sliderHeaderMeta}>
                  <Text style={[styles.sliderTitle, { color: colors.text }]}>Adjust {COLOR_FIELDS.find(([key]) => key === selectedColorKey)?.[1]}</Text>
                  <Text style={[styles.sliderValue, { color: colors.muted }]}>{themeInputs[selectedColorKey]}</Text>
                </View>
              </View>

              <View style={styles.sliderRow}>
                <Text style={[styles.sliderLabel, { color: colors.text }]}>Hue</Text>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={0}
                  maximumValue={360}
                  value={selectedHSV.h}
                  onValueChange={(value) => handleSliderChange('h', value)}
                  minimumTrackTintColor={hsvToHex({ h: selectedHSV.h, s: 1, v: 1 })}
                  maximumTrackTintColor={colors.muted + '66'}
                  thumbTintColor={hsvToHex({ h: selectedHSV.h, s: 1, v: 1 })}
                />
                <Text style={[styles.sliderNumber, { color: colors.muted }]}>{Math.round(selectedHSV.h)}</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={[styles.sliderLabel, { color: colors.text }]}>Sat</Text>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={0}
                  maximumValue={1}
                  value={selectedHSV.s}
                  onValueChange={(value) => handleSliderChange('s', value)}
                  minimumTrackTintColor={colors.muted}
                  maximumTrackTintColor={colors.muted + '66'}
                  thumbTintColor={themeInputs[selectedColorKey]}
                />
                <Text style={[styles.sliderNumber, { color: colors.muted }]}>{Math.round(selectedHSV.s * 100)}%</Text>
              </View>

              <View style={styles.sliderRow}>
                <Text style={[styles.sliderLabel, { color: colors.text }]}>Bri</Text>
                <Slider
                  style={styles.sliderControl}
                  minimumValue={0}
                  maximumValue={1}
                  value={selectedHSV.v}
                  onValueChange={(value) => handleSliderChange('v', value)}
                  minimumTrackTintColor={colors.text}
                  maximumTrackTintColor={colors.muted + '66'}
                  thumbTintColor={themeInputs[selectedColorKey]}
                />
                <Text style={[styles.sliderNumber, { color: colors.muted }]}>{Math.round(selectedHSV.v * 100)}%</Text>
              </View>
            </View>

            <View style={styles.themeActionsRow}>
              <TouchableOpacity style={[styles.themeButton, { backgroundColor: colors.primary }]} onPress={handleApplyTheme}>
                <Text style={styles.themeButtonText}>Apply Colors</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.themeButton, styles.themeButtonGhost, { borderColor: colors.primary }]} onPress={handleResetTheme}>
                <Text style={[styles.themeButtonText, { color: colors.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {renderAccordionHeader('reminders', 'Reminders')}
        {expandedSections.reminders && (
          <>
            <Text style={[styles.sub, { color: colors.muted }]}> 
              {nextCycle ? `Next predicted cycle: ${nextCycle}` : 'No cycle data yet.'}
            </Text>

            <View style={[styles.row, { borderTopColor: colors.muted + '33' }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Remind me 3 days before</Text>
              <Switch
                value={remind3Days}
                onValueChange={handleToggle3Days}
                trackColor={{ true: colors.primary }}
                disabled={!nextCycle}
              />
            </View>

            <View style={[styles.row, { borderTopColor: colors.muted + '33' }]}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Remind me 1 day before</Text>
              <Switch
                value={remind1Day}
                onValueChange={handleToggle1Day}
                trackColor={{ true: colors.primary }}
                disabled={!nextCycle}
              />
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {renderAccordionHeader('support', "Today's Support Checklist")}
        {expandedSections.support && (
          <>
            {SUPPORT_ACTION_OPTIONS.map((action) => (
              <View key={action} style={[styles.row, { borderTopColor: colors.muted + '33' }]}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{action}</Text>
                <Switch
                  value={todayActions.includes(action)}
                  onValueChange={() => handleToggleAction(action)}
                  trackColor={{ true: colors.secondary }}
                />
              </View>
            ))}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}> 
        {renderAccordionHeader('about', 'About')}
        {expandedSections.about && (
            <Text style={[styles.about, { color: colors.muted }]}> 
              Cycle Tracker helps you stay aware of your partner's cycle so you can offer better support.
              All data is stored locally on your device and never shared.
            </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: {
    position: 'relative',
    minHeight: 34,
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#00695C', textAlign: 'center' },
  headerDarkModeControl: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  accordionIcon: { fontSize: 22, fontWeight: '700', lineHeight: 22 },
  sectionTitleCompact: { marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  sub: { fontSize: 13, color: '#888', marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#666', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e3dce1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  rowLabel: { fontSize: 15, color: '#444', flex: 1 },
  darkModeIcon: { fontSize: 18 },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#00695C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  about: { fontSize: 14, color: '#666', lineHeight: 22 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  prefInput: { flex: 1, marginBottom: 0 },
  addButton: {
    backgroundColor: '#00695C',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetDot: { width: 10, height: 10, borderRadius: 5 },
  presetText: { fontSize: 12, fontWeight: '600' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  colorRowTouchable: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  colorPreview: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#ddd' },
  colorInputWrap: { flex: 1 },
  sliderPanel: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sliderHeaderMeta: { flex: 1 },
  sliderPreview: { width: 30, height: 30, borderRadius: 15, borderWidth: 1 },
  sliderTitle: { fontSize: 14, fontWeight: '700' },
  sliderValue: { fontSize: 12, marginTop: 2 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sliderLabel: { width: 32, fontSize: 13, fontWeight: '600' },
  sliderControl: { flex: 1, height: 34 },
  sliderNumber: { width: 44, fontSize: 12, textAlign: 'right' },
  themeActionsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  themeButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  themeButtonGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  themeButtonText: { color: '#fff', fontWeight: '700' },
  prefItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  prefText: { fontSize: 15, color: '#333', flex: 1 },
  prefRemove: { fontSize: 16, color: '#aaa', paddingLeft: 12 },
  emptyPref: { fontSize: 13, color: '#aaa', marginTop: 4, fontStyle: 'italic' },
});
