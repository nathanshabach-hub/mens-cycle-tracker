import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
            return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
          },
          tabBarActiveTintColor: '#00695C',
          tabBarInactiveTintColor: '#aaa',
          headerStyle: { backgroundColor: '#F4F9F8' },
          headerTintColor: '#00695C',
          headerTitleStyle: { fontWeight: '700' },
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
