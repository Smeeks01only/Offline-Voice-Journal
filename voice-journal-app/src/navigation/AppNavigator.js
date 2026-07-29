import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JournalScreen from '../screens/JournalScreen';
import TimelineScreen from '../screens/TimelineScreen';
import SearchScreen from '../screens/SearchScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import { colors, fonts } from '../theme/tokens';
import { Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.inkPlum,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: colors.coralBloom,
        tabBarInactiveTintColor: colors.sageWhisper,
        tabBarLabelStyle: {
          fontFamily: fonts.body,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Journal') {
            iconName = 'mic';
          } else if (route.name === 'Timeline') {
            iconName = 'clock';
          } else if (route.name === 'Search') {
            iconName = 'search';
          }
          return <Feather name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
    </Stack.Navigator>
  );
}
