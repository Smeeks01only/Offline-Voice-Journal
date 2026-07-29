import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts } from '../theme/tokens';
import { getRelativeTime } from '../utils/dateUtils';

export default function EntryCard({ entry, onPress }) {
  const isDone = entry.status === 'done';
  const isError = entry.status === 'error';
  
  const dateObj = new Date(entry.created_at);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formattedDate} • {getRelativeTime(entry.created_at)}</Text>
      </View>

      {isError ? (
        <Text style={styles.errorSnippet}>Couldn't process this entry.</Text>
      ) : isDone ? (
        <View>
          <Text style={styles.snippet} numberOfLines={3}>
            {entry.transcript}
          </Text>
          
          {entry.mood && (
            <View style={styles.moodPill}>
              <Text style={styles.moodText}>{entry.mood}</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.pendingSnippet}>Transcribing...</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.creamPaper,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.sageWhisper,
    textTransform: 'uppercase',
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
    color: colors.sageWhisper,
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
  }
});
