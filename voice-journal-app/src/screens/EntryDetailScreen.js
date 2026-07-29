import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/tokens';
import { getEntry, getReflection, updateEntry, createReflection } from '../db/entries';
import { processEntry } from '../services/gemini';
import WaveformPlayer from '../components/WaveformPlayer';

export default function EntryDetailScreen({ route }) {
  const { entryId } = route.params || {};
  const navigation = useNavigation();

  const [entry, setEntry] = useState(null);
  const [reflection, setReflection] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadData = useCallback(async () => {
    if (!entryId) return;
    try {
      const e = await getEntry(entryId);
      setEntry(e);
      if (e?.status === 'done') {
        const r = await getReflection(entryId);
        setReflection(r);
      }
    } catch (err) {
      console.error("Failed to load entry detail", err);
    }
  }, [entryId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      loadData();

      // Poll if it's not done/error
      const interval = setInterval(async () => {
        if (!isActive) return;
        const e = await getEntry(entryId);
        if (isActive) {
          setEntry(e);
          if (e?.status === 'done' || e?.status === 'error') {
            if (e?.status === 'done') {
              const r = await getReflection(entryId);
              setReflection(r);
            }
            clearInterval(interval);
          }
        }
      }, 2000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [entryId, loadData])
  );

  const handleRetry = async () => {
    if (!entry || !entry.audio_uri) return;
    setIsRetrying(true);
    try {
      await updateEntry(entryId, { status: 'transcribing', transcript: null });
      setEntry({ ...entry, status: 'transcribing' });
      
      const reflectionData = await processEntry(entry.audio_uri);
      
      await updateEntry(entryId, { 
        status: 'done',
        transcript: reflectionData.transcript
      });
      await createReflection(entryId, {
        mood: reflectionData.mood,
        themes: reflectionData.themes,
        summary: reflectionData.summary,
        follow_up_question: reflectionData.follow_up_question,
        model_version: 'gemini-3.6-flash'
      });
      
      await loadData();
    } catch (error) {
      console.error("Retry failed", error);
      let errorType = 'Processing Error';
      if (error.message.includes('RateLimitError')) errorType = 'Rate Limit Exceeded';
      else if (error.message.includes('InvalidKeyError')) errorType = 'Invalid API Key';
      else if (error.message.includes('NetworkError')) errorType = 'Network Connection Failed';
      
      await updateEntry(entryId, { 
        status: 'error',
        transcript: errorType + ': ' + error.message
      });
      await loadData();
    } finally {
      setIsRetrying(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.coralBloom} />
      </SafeAreaView>
    );
  }

  const isDone = entry.status === 'done';
  const isError = entry.status === 'error';
  
  const dateObj = new Date(entry.created_at);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <WaveformPlayer 
          audioUri={entry.audio_uri} 
          waveformSamples={entry.waveform_samples} 
          durationSec={entry.duration_sec} 
        />

        {!isDone && !isError && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={colors.sageWhisper} />
            <Text style={styles.statusText}>
              {entry.status === 'pending' ? 'Preparing audio...' : 'Transcribing and reflecting...'}
            </Text>
          </View>
        )}

        {isError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Transcription Failed</Text>
            <Text style={styles.errorText}>{entry.transcript || "An unknown error occurred."}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.retryButtonText}>Try Again</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isDone && (
          <View style={styles.doneContainer}>
            <Text style={styles.transcript}>{entry.transcript}</Text>

            {reflection && (
              <View style={styles.reflectionCard}>
                <View style={styles.pillContainer}>
                  {reflection.mood && (
                    <View style={styles.moodPill}>
                      <Text style={styles.moodText}>{reflection.mood}</Text>
                    </View>
                  )}
                  {reflection.themes && reflection.themes.map((theme, idx) => (
                    <View key={idx} style={styles.themePill}>
                      <Text style={styles.themeText}>{theme}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryText}>{reflection.summary}</Text>

                {reflection.follow_up_question && (
                  <View style={styles.questionContainer}>
                    <Text style={styles.questionText}>"{reflection.follow_up_question}"</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkPlum,
  },
  dateText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.sageWhisper,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.sageWhisper,
    marginLeft: 12,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 20,
    borderRadius: 16,
    marginTop: 10,
  },
  errorTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: '#D32F2F',
    opacity: 0.8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
  },
  retryButtonText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  doneContainer: {
    marginTop: 10,
  },
  transcript: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.inkPlum,
    lineHeight: 28,
    marginBottom: 32,
  },
  reflectionCard: {
    backgroundColor: colors.creamPaper,
    borderRadius: 20,
    padding: 24,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  moodPill: {
    backgroundColor: colors.dustyRose,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  moodText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.inkPlum,
    fontWeight: 'bold',
  },
  themePill: {
    backgroundColor: 'rgba(74, 93, 78, 0.1)', // sageWhisper very light
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 93, 78, 0.2)',
  },
  themeText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.sageWhisper,
  },
  summaryTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.inkPlum,
    marginBottom: 8,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkPlum,
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 24,
  },
  questionContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.coralBloom,
    paddingLeft: 16,
  },
  questionText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.inkPlum,
    fontStyle: 'italic',
    lineHeight: 30,
  }
});
