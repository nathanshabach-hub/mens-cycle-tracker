# Cycle Tracker

A mobile-first React Native and Expo app for tracking a partner's menstrual cycle, understanding cycle patterns, and keeping support needs visible. The same TypeScript codebase runs on Android, iOS, and the web.

## Features

### Home

- Shows the current phase when today's date falls within the calculated cycle timeline.
- Displays the latest cycle start, next predicted cycle, predicted ovulation date, fertile window, and average cycle length.
- Calculates a cycle regularity score and charts up to six recent cycle lengths.
- Provides a phase-aware daily support tip.
- Shows the saved partner name and comfort preferences.
- Supports cycle entries and daily logs through an inline form.

| Cycle entry | Daily log |
|-------------|-----------|
| Start date | Date |
| Optional end date, auto-filled from the profile period length | Multi-select moods |
| Multi-select moods | Multi-select symptoms |
| Multi-select symptoms | Notes |
| Notes | |

Daily-log types contain reserved fields for ovulation tests, pregnancy tests, intimacy, and protection, but these fields are not currently available in the logging form.

### Calendar and History

- Uses `react-native-calendars` with arrow and swipe month navigation.
- Marks confirmed and predicted period days, daily logs, the fertile window, ovulation, and today.
- Opens a date editor from any calendar day to create or update a daily note.
- Shows details for selected cycle and daily entries.
- Lists all saved entries with All, Cycle, and Daily filters and entry counts.
- Provides delete buttons with confirmation for cycle entries and daily logs.

| Marker | Meaning |
|--------|---------|
| Filled drop | Confirmed cycle or bleeding day |
| Outlined drop | Predicted period day |
| Blue circle | Daily log |
| Purple circle | Fertile window |
| Teal circle | Ovulation |
| Theme primary colour | Today |

### Insights

- Shows selectable recent months with the number of logged cycles and calculated shortest and longest cycle lengths.
- Displays the Menstrual, Follicular, Fertile Window, Ovulation, and Luteal phase timeline with dates and descriptions.
- Shows a pregnancy-mode status notice when that mode is enabled.

### Settings

- **Partner profile:** name, average period length, trying-to-conceive status, and pregnancy mode.
- **Partner preferences:** add and remove free-form comfort preferences.
- **App colours:** Teal, Sunset, Ocean, and Forest presets plus HSV sliders, HEX inputs, and reset controls.
- **Reminders:** separate toggles for 3 days and 1 day before the predicted next cycle.
- **Today's support checklist:** hydration, rest, meals, pain-relief supplies, and emotional check-ins.
- **Dark mode:** available from every screen and persisted with the selected app colours.
- **About:** app purpose and local-data privacy summary.

Notification controls require a cycle forecast. Enabling a reminder requests notification permission and scheduling is supported on physical devices.

## Pregnancy Mode

Pregnancy mode is stored in the partner profile. Turning it on currently:

- shows a status banner on Home and Insights;
- replaces the Home daily tip with pregnancy-focused support guidance; and
- preserves all existing cycle and daily-log data.

Pregnancy mode currently changes status and guidance only. It does not disable cycle forecasts, fertile-window calculations, phase cards, reminders, or cycle logging.

## Prediction Logic

The app calculates average cycle length from valid intervals between saved cycle starts. It uses a 28-day default when there are fewer than two cycle starts.

```text
next cycle start  = latest cycle start + average cycle length
ovulation         = next cycle start - 14 days
fertile start     = ovulation - 5 days
fertile end       = ovulation + 1 day
```

The displayed phase timeline uses these ranges:

| Phase | Range |
|-------|-------|
| Menstrual | Latest cycle start through day 5 |
| Follicular | Day 6 through the day before the fertile window |
| Fertile Window | Five days before ovulation through one day after ovulation |
| Ovulation | Predicted ovulation day |
| Luteal | Day after ovulation through the day before the next predicted cycle |

Predictions are estimates based on recorded cycle dates and are not medical advice.

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Expo 54 |
| UI | React Native 0.81 and React 19 |
| Language | TypeScript 5.9 in strict mode |
| Navigation | React Navigation 7 bottom tabs |
| Calendar | react-native-calendars 1.1314 |
| Date calculations | date-fns 4 |
| Local storage | AsyncStorage 2.2 |
| Notifications | expo-notifications 0.32 |
| Web | react-native-web 0.21 |

## Project Structure

```text
mens-cycle-tracker/
├── App.tsx                       # Theme-aware bottom-tab navigator
├── index.ts                      # Expo entry point
├── app.json                      # Expo application configuration
├── eas.json                      # EAS build profiles
├── assets/                       # App icons and splash assets
└── src/
    ├── screens/
    │   ├── HomeScreen.tsx        # Dashboard and entry form
    │   ├── CalendarScreen.tsx    # Calendar, notes, and history
    │   ├── InsightsScreen.tsx    # Monthly and phase insights
    │   └── SettingsScreen.tsx    # Profile, theme, reminders, and support
    ├── theme/
    │   └── AppThemeContext.tsx   # Persisted theme state and presets
    ├── types/
    │   └── index.ts              # Shared models and option lists
    └── utils/
        ├── calculations.ts       # Standalone fertility calculation helper
        ├── insights.ts           # Phase, monthly, and export-data helpers
        └── storage.ts            # Persistence and forecast helpers
```

Export formatting helpers exist in `src/utils/insights.ts`, but there is currently no export or share control in the app interface.

## Getting Started

### Prerequisites

- Node.js 20 LTS or newer
- An Android emulator, iOS simulator, or physical device with Expo Go for native development

### Install

```bash
git clone https://github.com/nathanshabach-hub/mens-cycle-tracker.git
cd mens-cycle-tracker
npm install
```

### Run

| Target | Command |
|--------|---------|
| Expo development server | `npm start` |
| Web browser | `npm run web` |
| Android emulator/device | `npm run android` |
| iOS simulator | `npm run ios` |
| Static web export | `npm run build:web` |

The default web development URL is [http://localhost:8081](http://localhost:8081). Expo may choose another port when that port is already occupied. For a physical device, scan the QR code printed by the development server.

### Validate

```bash
npm run typecheck
npm test
```

Both commands currently run TypeScript compilation with `tsc --noEmit`; the project does not yet include a separate unit-test suite.

## Data and Privacy

Cycle entries, daily logs, partner-profile settings, support checklists, and theme colours are stored locally with AsyncStorage. No account or login is required. Enabling reminders uses the device notification APIs.

## License

Private - all rights reserved.