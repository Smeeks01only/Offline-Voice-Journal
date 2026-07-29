import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';

import { colors, fonts } from '../theme/tokens';
import RecordButton from '../components/RecordButton';
import { getAllEntries } from '../db/entries';
import { getRelativeTime } from '../utils/dateUtils';

const InsightSparkline = ({ entries }) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const days = Array(7).fill(0).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return { date: d, count: 0, label: d.toLocaleDateString('en-US', { weekday: 'short' })[0] };
  });

  entries.forEach(entry => {
    if (entry.status !== 'done') return;
    const entryDate = new Date(entry.created_at);
    entryDate.setHours(0,0,0,0);
    const diffTime = today - entryDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      days[6 - diffDays].count++;
    }
  });

  const maxCount = Math.max(...days.map(d => d.count), 1);
  
  const width = 280;
  const height = 80;
  const paddingX = 10;
  const paddingY = 10;
  
  const getPoint = (index, count) => {
    const x = paddingX + (index * ((width - 2 * paddingX) / 6));
    const y = height - paddingY - (count / maxCount) * (height - 2 * paddingY);
    return { x, y };
  };

  const points = days.map((d, i) => {
    const pt = getPoint(i, d.count);
    return `${pt.x},${pt.y}`;
  }).join(' ');

  return (
    <View style={styles.chartContainer}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height - paddingY} x2={width} y2={height - paddingY} stroke={colors.sageWhisper} strokeWidth="1" strokeOpacity={0.3} />
        <Polyline points={points} fill="none" stroke={colors.coralBloom} strokeWidth="3" />
        {days.map((d, i) => {
          const pt = getPoint(i, d.count);
          return (
            <Circle key={i} cx={pt.x} cy={pt.y} r="4" fill={colors.coralBloom} />
          );
        })}
      </Svg>
      <View style={styles.chartLabels}>
        {days.map((d, i) => (
          <Text key={i} style={[styles.chartLabelText, { left: getPoint(i, d.count).x - 10 }]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};


export default function JournalScreen() {
  const [entries, setEntries] = useState([]);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchEntries = async () => {
        try {
          const fetched = await getAllEntries();
          if (isActive) setEntries(fetched);
        } catch (error) {
          console.error("Failed to fetch entries", error);
        }
      };
      
      // Initial fetch
      fetchEntries();
      
      // Poll constantly while screen is focused so we see "transcribing..." update live!
      const interval = setInterval(fetchEntries, 2000);
      
      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  const recentEntry = entries.length > 0 ? entries[0] : null;
  const doneEntriesCount = entries.filter(e => e.status === 'done').length;

  return (
    <LinearGradient
      colors={[colors.peachMist, colors.dustyRose]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.heading}>Your journal</Text>

          <View style={styles.ctaCard}>
            <RecordButton />
            <Text style={styles.ctaLabel}>Tap to record a moment.</Text>
          </View>

          {recentEntry && (
            <Pressable 
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => navigation.navigate('EntryDetail', { entryId: recentEntry.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{getRelativeTime(recentEntry.created_at)}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              
              {recentEntry.status === 'error' ? (
                <Text style={styles.errorSnippet}>Couldn't process this entry.</Text>
              ) : recentEntry.status === 'done' ? (
                <View>
                  <Text style={styles.snippet} numberOfLines={2}>
                    {recentEntry.transcript}
                  </Text>
                  
                  {recentEntry.mood && (
                    <View style={styles.moodPill}>
                      <Text style={styles.moodText}>{recentEntry.mood}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.pendingSnippet}>Transcribing...</Text>
              )}
            </Pressable>
          )}

          <View style={styles.sectionHeaderContainer}>
             <Text style={styles.sectionHeader}>Insights</Text>
          </View>
          
          {doneEntriesCount < 3 ? (
            <View style={[styles.card, styles.placeholderCard]}>
              <Text style={styles.placeholderText}>Insights appear once you've journaled a few times.</Text>
            </View>
          ) : (
            <Pressable 
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => navigation.navigate('Timeline')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Entries per day</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              
              <InsightSparkline entries={entries} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  heading: { 
    fontFamily: fonts.display, 
    fontSize: 36, 
    color: colors.inkPlum, 
    marginBottom: 24 
  },
  ctaCard: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  ctaLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkPlum,
    opacity: 0.8,
    marginTop: -10,
  },
  card: {
    backgroundColor: colors.creamPaper,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeholderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  placeholderText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkPlum,
    opacity: 0.6,
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.sageWhisper,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: fonts.body,
    fontWeight: 'bold',
    fontSize: 14,
    color: colors.sageWhisper,
    textTransform: 'uppercase',
  },
  chevron: {
    fontFamily: fonts.body,
    fontSize: 20,
    color: colors.inkPlum,
    opacity: 0.3,
  },
  snippet: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkPlum,
    lineHeight: 24,
  },
  errorSnippet: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkPlum,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  pendingSnippet: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.coralBloom,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  moodPill: {
    backgroundColor: colors.dustyRose,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  moodText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.inkPlum,
    fontWeight: 'bold',
  },
  sectionHeaderContainer: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.inkPlum,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
  },
  chartLabels: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 20,
  },
  chartLabelText: {
    position: 'absolute',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.sageWhisper,
    width: 20,
    textAlign: 'center',
  }
});
