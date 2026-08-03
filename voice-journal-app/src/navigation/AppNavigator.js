import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import JournalScreen from '../screens/JournalScreen';
import TimelineScreen from '../screens/TimelineScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
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
          backgroundColor: colors.charcoal,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
        },
        tabBarActiveTintColor: colors.paperWhite,
        tabBarInactiveTintColor: colors.slateGray,
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
          } else if (route.name === 'Profile') {
            iconName = 'user';
          }
          return <Feather name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
