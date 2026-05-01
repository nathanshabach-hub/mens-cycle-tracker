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
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  getCycleEntries,
  predictFertilityWindow,
  getPartnerProfile,
  savePartnerProfile,
  getSupportActionsForDate,
  saveSupportActionsForDate,
} from '../utils/storage';
import { subDays, parseISO, format } from 'date-fns';
import { SUPPORT_ACTION_OPTIONS } from '../types';

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
  const [remind3Days, setRemind3Days] = useState(false);
  const [remind1Day, setRemind1Day] = useState(false);
  const [nextCycle, setNextCycle] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [tryingToConceive, setTryingToConceive] = useState(false);
  const [averagePeriodLength, setAveragePeriodLength] = useState('5');
  const [todayActions, setTodayActions] = useState<string[]>([]);
  const [partnerPreferences, setPartnerPreferences] = useState<string[]>([]);
  const [newPreference, setNewPreference] = useState('');

  const load = useCallback(async () => {
    const entries = await getCycleEntries();
    const forecast = predictFertilityWindow(entries);
    const profile = await getPartnerProfile();
    const today = format(new Date(), 'yyyy-MM-dd');
    const actions = await getSupportActionsForDate(today);

    setNextCycle(forecast?.nextCycleStart ?? null);
    setPartnerName(profile.partnerName);
    setTryingToConceive(profile.tryingToConceive);
    setAveragePeriodLength(String(profile.averagePeriodLength));
    setTodayActions(actions);
    setPartnerPreferences(profile.partnerPreferences ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      averagePeriodLength: periodLengthNum,
      partnerPreferences,
    });
    Alert.alert('Saved', 'Partner profile updated successfully.');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Partner Profile</Text>

        <Text style={styles.inputLabel}>Partner name</Text>
        <TextInput
          style={styles.input}
          value={partnerName}
          onChangeText={setPartnerName}
          placeholder="Optional"
        />

        <Text style={styles.inputLabel}>Average period length (days)</Text>
        <TextInput
          style={styles.input}
          value={averagePeriodLength}
          onChangeText={setAveragePeriodLength}
          keyboardType="number-pad"
          maxLength={2}
        />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Trying to conceive</Text>
          <Switch
            value={tryingToConceive}
            onValueChange={setTryingToConceive}
            trackColor={{ true: '#00695C' }}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Partner Preferences</Text>
        <Text style={styles.sub}>
          Things that help her — you'll be reminded to check these during key phases.
        </Text>

        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, styles.prefInput]}
            value={newPreference}
            onChangeText={setNewPreference}
            placeholder="e.g. chocolate, heat pack, quiet time"
            maxLength={40}
            onSubmitEditing={handleAddPreference}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddPreference}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {partnerPreferences.length === 0 && (
          <Text style={styles.emptyPref}>No preferences added yet.</Text>
        )}
        {partnerPreferences.map((item) => (
          <View key={item} style={styles.prefItem}>
            <Text style={styles.prefText}>{item}</Text>
            <TouchableOpacity onPress={() => handleRemovePreference(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.prefRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <Text style={styles.sub}>
          {nextCycle ? `Next predicted cycle: ${nextCycle}` : 'No cycle data yet.'}
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Remind me 3 days before</Text>
          <Switch
            value={remind3Days}
            onValueChange={handleToggle3Days}
            trackColor={{ true: '#00695C' }}
            disabled={!nextCycle}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Remind me 1 day before</Text>
          <Switch
            value={remind1Day}
            onValueChange={handleToggle1Day}
            trackColor={{ true: '#00695C' }}
            disabled={!nextCycle}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today's Support Checklist</Text>
        {SUPPORT_ACTION_OPTIONS.map((action) => (
          <View key={action} style={styles.row}>
            <Text style={styles.rowLabel}>{action}</Text>
            <Switch
              value={todayActions.includes(action)}
              onValueChange={() => handleToggleAction(action)}
              trackColor={{ true: '#26A69A' }}
            />
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.about}>
          Cycle Tracker helps you stay aware of your partner's cycle so you can offer better support.
          All data is stored locally on your device and never shared.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F9F8' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#00695C', marginBottom: 20, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
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
