import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';

import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/db/database';
import { colors } from './src/theme/tokens';
import { RecordingProvider, useRecording } from './src/context/RecordingContext';
import RetryBanner from './src/components/RetryBanner';
import { getStuckEntries, updateEntry, createReflection } from './src/db/entries';
import { processEntry } from './src/services/gemini';

function AppForegroundHandler() {
  const { processRecordingJob } = useRecording();
  const [stuckEntries, setStuckEntries] = useState([]);
  const appState = useRef(AppState.currentState);

  const checkStuckEntries = async () => {
    try {
      const stuck = await getStuckEntries();
      if (stuck && stuck.length > 0) {
        setStuckEntries(stuck);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkStuckEntries();
    
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkStuckEntries();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleRetryAll = async () => {
    const entriesToRetry = [...stuckEntries];
    setStuckEntries([]); // dismiss banner immediately
    
    for (const entry of entriesToRetry) {
      if (entry.audio_uri) {
        try {
          await updateEntry(entry.id, { status: 'transcribing' });
          const reflectionData = await processEntry(entry.audio_uri);
          
          await updateEntry(entry.id, { status: 'done', transcript: reflectionData.transcript });
          await createReflection(entry.id, {
            mood: reflectionData.mood,
            themes: reflectionData.themes,
            summary: reflectionData.summary,
            follow_up_question: reflectionData.follow_up_question,
            model_version: 'gemini-3.6-flash'
          });
        } catch (e) {
          console.error("Retry failed for", entry.id);
          await updateEntry(entry.id, { status: 'error', transcript: "Retry failed: " + e.message });
        }
      }
    }
  };

  return (
    <RetryBanner 
      count={stuckEntries.length} 
      onPress={handleRetryAll} 
      onDismiss={() => setStuckEntries([])} 
    />
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);

  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    IBMPlexMono_400Regular,
  });

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setDbInitialized(true);
      } catch (e) {
        console.error("Database initialization failed:", e);
      }
    };
    setup();
  }, []);

  if (!fontsLoaded || !dbInitialized) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>Loading Voice Journal...</Text>
      </View>
    );
  }

  return (
    <RecordingProvider>
      <AppForegroundHandler />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </RecordingProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.peachMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 18,
    color: colors.inkPlum,
  }
});
