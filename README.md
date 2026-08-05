# Cycle Tracker 🩸

A mobile-first React Native / Expo app designed to help partners track, understand, and support a loved one's menstrual cycle. Built with TypeScript, it runs on iOS, Android, and the web from a single codebase.

---

## Screenshots

> Screenshots coming soon.

---

## Features

### 🏠 Home — Cycle Tracker
- **Current phase indicator** — displays the active phase (Menstrual, Follicular, Fertile Window, Ovulation, Luteal) with an emoji, colour, and short description.
- **Last cycle started** — shows the most recent cycle start date at a glance.
- **Next predicted cycle** — forecasted start date based on average cycle length.
- **Predicted ovulation day** — calculated 14 days before the next expected period, with the fertile window shown.
- **Cycle regularity score** — 0–100 score with a progress bar based on cycle-to-cycle variation.
- **Recent cycle lengths** — trend list of the last several cycle lengths.
- **Daily support tip** — contextual tip based on the current phase (e.g. "Stable phase: focus on healthy routines, sleep, and supportive check-ins").
- **+ Log Entry button** — opens a bottom-sheet form to log a new cycle or daily entry.

#### Log Entry Form
| Cycle Entry | Daily Log |
|-------------|-----------|
| Start date (inline calendar picker, dd/MM/yy) | Date (inline calendar picker) |
| End date auto-filled from avg period length | Multi-select moods (accordion) |
| Multi-select moods (accordion) | Multi-select symptoms (accordion) |
| Multi-select symptoms (accordion) | Free-text notes |
| Free-text notes | Ovulation test result |
| | Pregnancy test result |
| | Intimacy / protection logged |

---

### 📅 History — Cycle Calendar
- **Interactive calendar** powered by `react-native-calendars` with month navigation arrows (‹ ›).
- **Colour-coded markers** on each day:
  | Marker | Meaning |
  |--------|---------|
  | 🩸 Filled drop | Confirmed cycle / bleeding day |
  | ◇ Outlined drop | Predicted remaining period days (based on avg period length) |
  | Blue circle | Daily log entry |
  | Purple circle | Fertile window |
  | Teal circle | Ovulation day |
  | Primary colour | Today |
  | Purple circle | Fertile window |
  | Teal circle | Ovulation day |
  | Primary colour | Today |
- **Tap any highlighted date** to view full entry details in a detail card below the calendar.
- **All Logged Entries list** — filterable by All / Cycle / Daily with entry counts shown on each filter chip.
- **Inline delete** — swipeable delete button on every entry row.
- **Edit daily log notes** — tap any date to open an editor modal for that day's notes.

---

### 📊 Insights & Analytics
- **Monthly breakdown** — per-month cards showing:
  - Number of cycles logged
  - Average cycle length
  - Shortest and longest cycle
  - Predicted phase for that month
- **Phase timeline** — visual phase-by-phase breakdown (Menstrual → Follicular → Fertile Window → Ovulation → Luteal) with start/end dates for the current cycle.
- **Partner profile context** — insights are personalised when a partner name and trying-to-conceive (TTC) mode are configured.

---

### ⚙️ Settings
- **Partner profile**
  - Partner name
  - Trying to conceive toggle
  - Pregnancy mode toggle
  - Average period length (days) — used to auto-fill cycle end date and show predicted period days on the calendar
  - Partner preferences (multi-select from preset list)
- **Colour theme**
  - One-tap preset palettes: **Teal** (default), **Sunset**, **Ocean**, **Forest**
  - Full custom colour editor — pick Primary, Secondary, Background, Card, Text, and Muted colours individually using an HSV colour picker with live hex input.
  - Reset to defaults button
- **Reminders & Notifications**
  - Toggle push notifications on/off
  - Set how many days before the predicted next cycle to send a reminder (slider, 1–7 days)
  - "Send test notification" button
- **Support actions** — checkable list of support actions for the current/upcoming phase (e.g. "Hydration reminder", "Emotional support check-in").
- **Dark mode** — toggle available on every screen (top-right moon icon). All chip text, labels and icons adapt to dark/light theme.
- **About** — app version and description.

---

## Cycle Phase Logic

Phases are calculated from the last logged cycle start date and the fertility forecast:

| Phase | Duration | Description |
|-------|----------|-------------|
| Menstrual | Days 1–5 | Rest & hydration phase |
| Follicular | Days 6 – fertile window start | Energy & growth phase |
| Fertile Window | 5 days before ovulation | High fertility window |
| Ovulation | 14 days before next cycle | Peak fertility day |
| Luteal | Ovulation + 1 → next cycle | Preparation phase |

**Fertility forecast formula:**
- `nextCycleStart = lastPeriodStart + averageCycleLength`
- `ovulationDate = nextCycleStart − 14`
- `fertileWindowStart = ovulationDate − 5`
- `fertileWindowEnd = ovulationDate`

---

## Tech Stack

| Layer | Library / Tool |
|-------|---------------|
| Framework | [Expo](https://expo.dev) ~54 |
| Language | TypeScript 5.9 |
| UI | React Native 0.81 |
| Navigation | React Navigation 7 (Bottom Tabs) |
| Calendar | react-native-calendars 1.13 |
| Date math | date-fns 4 |
| Storage | AsyncStorage (@react-native-async-storage/async-storage) |
| Notifications | expo-notifications |
| Slider | @react-native-community/slider |
| Web support | react-native-web |

---

## Project Structure

```
mens-cycle-tracker/
├── App.tsx                   # Root navigator & tab bar
├── index.ts                  # Expo entry point
├── app.json                  # Expo config
├── assets/                   # Icons, splash screen
└── src/
    ├── screens/
    │   ├── HomeScreen.tsx     # Dashboard & log entry form
    │   ├── CalendarScreen.tsx # History calendar & entry list
    │   ├── InsightsScreen.tsx # Monthly analytics & phase timeline
    │   └── SettingsScreen.tsx # Profile, theme, notifications
    ├── theme/
    │   └── AppThemeContext.tsx # Global theme state & colour presets
    ├── types/
    │   └── index.ts           # Shared types, mood/symptom constants
    └── utils/
        ├── calculations.ts    # Fertility forecast calculations
        ├── insights.ts        # Phase & monthly insight builders
        └── storage.ts         # AsyncStorage read/write helpers
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) or `npx`
- iOS Simulator / Android Emulator **or** the [Expo Go](https://expo.dev/go) app on your phone

### Install

```bash
git clone https://github.com/nathanshabach-hub/mens-cycle-tracker.git
cd mens-cycle-tracker
npm install
```

### Run

| Target | Command |
|--------|---------|
| Expo DevTools (all platforms) | `npm start` |
| iOS simulator | `npm run ios` |
| Android emulator | `npm run android` |
| Web browser | `npm run web` |

Then open [http://localhost:8081](http://localhost:8081) for web, or scan the QR code with **Expo Go** on your phone.

### Type-check

```bash
npm test        # runs tsc --noEmit
npm run typecheck
```

---

## Data Privacy

All data is stored **locally on-device** using AsyncStorage. Nothing is transmitted to any server. No account or login is required.

---

## Mood Options

Positive: Happy, Energetic, Confident, Motivated, Calm  
Neutral: Neutral  
Negative (PMS/PMDD criteria): Irritable, Angry, Tense, Anxious, Overwhelmed, Sensitive, Sad, Tearful, Depressed, Withdrawn

## Symptom Options

Cramps, Bloating, Headache, Migraine, Fatigue, Low Energy, Back Pain, Pelvic Pain, Breast Tenderness, Breast Fullness, Nausea, Digestive Upset, Constipation, Diarrhea, Gas, Food Cravings, Increased/Reduced Appetite, Acne, Oily/Dry Skin, Water Retention, Sleep Changes, Insomnia, Anxiety, Irritability, Mood Swings, Low Mood, Stress, Brain Fog, Dizziness, Hot Flashes, Chills, Increased Discharge, Ovulation Pain, Spotting, Heavy/Light Flow

---

## License

Private — all rights reserved.
