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
import { getStuckEntries, updateEntry, createReflection, getSetting, setSetting } from './src/db/entries';
import { processEntry } from './src/services/gemini';
import { LockProvider, useLock } from './src/context/LockContext';
import LockScreen from './src/screens/LockScreen';
import DataDisclosureScreen from './src/screens/DataDisclosureScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

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

function AppContent() {
  const { isLocked, isReady } = useLock();

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>Loading Voice Journal...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppForegroundHandler />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      {isLocked && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <LockScreen mode="unlock" />
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isDisclosurePending, setIsDisclosurePending] = useState(true);

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
        const ack = await getSetting('dataDisclosureAcknowledged');
        if (ack) {
          setIsDisclosurePending(false);
        }
      } catch (e) {
        console.error("Database initialization failed:", e);
      }
    };
    setup();
  }, []);

  const handleAcknowledge = async () => {
    try {
      await setSetting('dataDisclosureAcknowledged', new Date().toISOString());
      setIsDisclosurePending(false);
    } catch (e) {
      console.error(e);
      setIsDisclosurePending(false);
    }
  };

  if (!fontsLoaded || !dbInitialized) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>Loading Voice Journal...</Text>
      </View>
    );
  }

  if (isDisclosurePending) {
    return <DataDisclosureScreen onAcknowledge={handleAcknowledge} />;
  }

  return (
    <ErrorBoundary>
      <LockProvider>
        <RecordingProvider>
          <AppContent />
        </RecordingProvider>
      </LockProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 18,
    color: colors.paperWhite,
  }
});
