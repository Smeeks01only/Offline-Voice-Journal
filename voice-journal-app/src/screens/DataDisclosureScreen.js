import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/tokens';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

export default function DataDisclosureScreen({ onAcknowledge }) {
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Your Data</Text>
        
        <Text style={styles.paragraph}>
          Your recordings are sent to external services to generate a transcript and reflection. Transcription is not handled locally, so audio and transcripts temporarily leave your device for this processing.
        </Text>
        
        <Text style={styles.paragraph}>
          Everything else — your journal, search, and settings — stays stored only on this device and is not backed up to the cloud.
        </Text>

        <TouchableOpacity onPress={() => setShowPrivacyPolicy(true)} style={styles.linkButton}>
          <Text style={styles.linkText}>Read Privacy Policy</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.primaryButton} onPress={onAcknowledge}>
          <Text style={styles.primaryButtonText}>I understand</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPrivacyPolicy} animationType="slide">
        <PrivacyPolicyScreen 
          route={{ params: { standalone: true, onClose: () => setShowPrivacyPolicy(false) } }} 
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
  content: {
    flex: 1,
    padding: 32,
    paddingTop: 64,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.paperWhite,
    marginBottom: 40,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.paperWhite,
    lineHeight: 28,
    marginBottom: 24,
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    backgroundColor: colors.paperWhite,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.obsidian,
  }
});
