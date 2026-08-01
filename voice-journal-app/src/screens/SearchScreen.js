import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/tokens';
import { searchEntries } from '../db/entries';
import EntryCard from '../components/EntryCard';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigation = useNavigation();

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    try {
      const fetched = await searchEntries(query.trim());
      setResults(fetched);
      setHasSearched(true);
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {!hasSearched ? (
        <Text style={styles.emptyText}>Search your past entries.</Text>
      ) : (
        <Text style={styles.emptyText}>No entries matched "{query}".</Text>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.obsidian, colors.obsidian]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.heading}>Search</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Find a memory or topic..."
              placeholderTextColor={colors.slateGray}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text === '') setHasSearched(false);
              }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  setQuery('');
                  setResults([]);
                  setHasSearched(false);
                }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <FlatList
          data={results}
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
    color: colors.paperWhite,
    marginBottom: 16
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.paperWhite,
    height: '100%',
  },
  clearButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.slateGray,
    fontSize: 16,
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
    marginTop: 80,
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
