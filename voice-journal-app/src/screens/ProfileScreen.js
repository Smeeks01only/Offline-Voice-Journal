import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { colors, fonts } from '../theme/tokens';
import { getSetting, setSetting, getStats, clearAllData, getAllEntries, getReflection } from '../db/entries';
import { useLock } from '../context/LockContext';
import LockScreen from './LockScreen';

export default function ProfileScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [stats, setStats] = useState({ totalEntries: 0, entriesThisWeek: 0, currentStreak: 0 });
  const { isLockEnabled, disableLock } = useLock();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const loadData = async () => {
    try {
      const name = await getSetting('displayName');
      if (name) setDisplayName(name);
      
      const s = await getStats();
      setStats(s);
    } catch (e) {
      console.error("Failed to load profile data", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleNameSave = async () => {
    try {
      await setSetting('displayName', displayName);
    } catch (e) {
      console.error("Failed to save name", e);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const entries = await getAllEntries();
      const exportData = [];
      
      for (const entry of entries) {
        let reflection = null;
        if (entry.status === 'done') {
          reflection = await getReflection(entry.id);
        }
        exportData.push({
          ...entry,
          reflection
        });
      }
      
      const jsonStr = JSON.stringify(exportData, null, 2);
      const fileUri = FileSystem.cacheDirectory + 'journal_export.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Journal Entries',
        });
      } else {
        Alert.alert("Sharing not available", "Your device does not support sharing this file.");
      }
    } catch (e) {
      console.error("Failed to export data", e);
      if (e.message && !e.message.includes('Another share request is being processed now')) {
        Alert.alert("Export Failed", "Could not export your entries.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear all data?",
      "This will permanently delete all your entries, reflections, and audio files. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              setDisplayName('');
              setStats({ totalEntries: 0, entriesThisWeek: 0, currentStreak: 0 });
              Alert.alert("Data Cleared", "All your journal data has been deleted.");
            } catch (e) {
              console.error("Failed to clear data", e);
              Alert.alert("Error", "Could not clear all data.");
            }
          }
        }
      ]
    );
  };

  const handleToggleLock = (value) => {
    if (value) {
      setShowSetupModal(true);
    } else {
      disableLock();
    }
  };

  const appName = Constants.expoConfig?.name || 'Voice Journal';
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Profile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="How should we call you?"
              placeholderTextColor={colors.slateGray}
              value={displayName}
              onChangeText={setDisplayName}
              onBlur={handleNameSave}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Require unlock to open app</Text>
            <Switch
              value={isLockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: colors.charcoal, true: colors.paperWhite }}
              thumbColor={isLockEnabled ? colors.charcoal : colors.slateGray}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.entriesThisWeek}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExport} disabled={isExporting}>
            <Text style={[styles.actionButtonText, isExporting && { opacity: 0.5 }]}>
              {isExporting ? 'Exporting...' : 'Export my entries'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.actionButtonText}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.destructiveButton]} onPress={handleClearData}>
            <Text style={styles.destructiveButtonText}>Clear all data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aboutSection}>
          <Text style={styles.aboutText}>{appName} v{appVersion}</Text>
        </View>
      </ScrollView>

      <Modal visible={showSetupModal} animationType="slide">
        <LockScreen 
          mode="setup" 
          onSetupComplete={() => setShowSetupModal(false)}
          onCancelSetup={() => setShowSetupModal(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.paperWhite,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.slateGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.paperWhite,
    height: '100%',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.paperWhite,
  },
  statsCard: {
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    flexDirection: 'row',
    paddingVertical: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.paperWhite,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.slateGray,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.hairline,
  },
  actionButton: {
    backgroundColor: colors.charcoal,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.paperWhite,
  },
  destructiveButton: {
    borderColor: 'rgba(217, 124, 124, 0.2)',
  },
  destructiveButtonText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.errorRed,
  },
  aboutSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  aboutText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.slateGray,
  },
});
