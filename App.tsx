import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { AppThemeProvider, useAppTheme } from './src/theme/AppThemeContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const { colors } = useAppTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.primary,
      border: colors.muted,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              Home: '🏠',
              Calendar: '📅',
              Insights: '📊',
              Settings: '⚙️',
            };
            return <Text style={{ fontSize: size - 4, color }}>{icons[route.name]}</Text>;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.muted,
          },
          sceneStyle: { backgroundColor: colors.background },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Cycle Tracker' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'History' }} />
        <Tab.Screen name="Insights" component={InsightsScreen} options={{ title: 'Insights' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AppNavigator />
    </AppThemeProvider>
  );
}
