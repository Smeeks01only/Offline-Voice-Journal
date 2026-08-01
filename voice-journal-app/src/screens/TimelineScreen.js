import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/tokens';
import { getAllEntries } from '../db/entries';
import { getRelativeTime } from '../utils/dateUtils';
import EntryCard from '../components/EntryCard';

export default function TimelineScreen() {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchEntries = async () => {
    try {
      const fetched = await getAllEntries();
      setEntries(fetched);
    } catch (error) {
      console.error("Failed to fetch entries", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        try {
          const fetched = await getAllEntries();
          if (isActive) setEntries(fetched);
        } catch (error) {
          console.error("Failed to fetch entries", error);
        }
      };
      load();
      const interval = setInterval(load, 3000);
      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, []);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Nothing here yet — your recorded entries will show up on this timeline.</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.obsidian, colors.obsidian]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.heading}>Timeline</Text>
        </View>
        
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <EntryCard 
              entry={item} 
              onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.paperWhite}
              colors={[colors.paperWhite]}
            />
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  heading: { 
    fontFamily: fonts.display, 
    fontSize: 36, 
    color: colors.paperWhite 
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 24,
  }
});
