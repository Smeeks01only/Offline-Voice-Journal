import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/tokens';
import { Feather } from '@expo/vector-icons';

export default function PrivacyPolicyScreen({ navigation, route }) {
  // If passed as a prop (e.g. from a Modal), or from route params
  const isStandalone = route?.params?.standalone;
  const onClose = route?.params?.onClose;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {isStandalone ? (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Feather name="x" size={24} color={colors.paperWhite} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.paperWhite} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>What data is collected</Text>
        <Text style={styles.paragraph}>
            This app records audio when you choose to journal an entry. It also stores a
          text transcript, an AI-generated reflection (mood, themes, a summary, and a
          follow-up question), and basic app settings (such as whether app lock is
          enabled). No account, email address, or personal identifying information is
          collected — there is no sign-up or login for this app.
        </Text>

        <Text style={styles.sectionTitle}>What is sent to external servers</Text>
        <Text style={styles.paragraph}>
          Your recorded audio is sent to Google's Gemini API to generate a transcript
          and a reflection. This app uses a paid Gemini API tier, under which Google
          does not use your audio, transcripts, or reflections to train or improve its
          AI models, and your content is not reviewed by human staff for that purpose.
          Google does retain prompts and responses for up to 55 days solely to detect
          abuse and enforce its usage policies, as it does for all API traffic
          regardless of tier — this data is not used for training and is handled
          under Google's standard Cloud data processing terms. Beyond that window,
          processing is transient: your audio and the generated results are returned
          to the app and are not otherwise stored by Google.
        </Text>

        <Text style={styles.sectionTitle}>What is stored locally</Text>
        <Text style={styles.paragraph}>
          Your journal entries — audio recordings, transcripts, reflections, and any
          edits you make — are stored only on this device's local storage. This data
          is not backed up to any cloud service, is excluded from Android and iOS
          automatic device backups, and is not synced to any other device or server
          by this app. If you want a copy of your data elsewhere, use the "Export my
          entries" option on the Profile screen — this is the only way your data
          leaves this device outside of the Gemini processing step described above.
        </Text>

        <Text style={styles.sectionTitle}>Data retention</Text>
        <Text style={styles.paragraph}>
          Entries are kept on this device indefinitely until you delete them
          individually, use "Clear all data" on the Profile screen, or uninstall the
          app — any of which permanently and immediately removes them from this
          device. Because entries are not backed up to the cloud, deleting the app or
          losing the device means this data cannot be recovered unless you have
          previously used the export feature to save a copy elsewhere.
        </Text>

        <Text style={styles.sectionTitle}>Contact Info</Text>
        <Text style={styles.paragraph}>
          Questions about this policy or how your data is handled can be sent to
          [sirbasil.1000@gmail.com].
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.paperWhite,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.paperWhite,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
    lineHeight: 24,
  }
});
