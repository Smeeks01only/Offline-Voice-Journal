import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { processEntry } from '../services/gemini';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DevTestScreen() {
  const [recording, setRecording] = useState();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  const startRecording = async () => {
    try {
      setResult(null);
      setError(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      
      // Auto stop after 5 seconds
      setTimeout(async () => {
        await stopRecordingAndProcess(recording);
      }, 5000);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      setError(err.message);
    }
  };

  const stopRecordingAndProcess = async (activeRecording) => {
    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      setRecording(undefined);
      
      setIsProcessing(true);
      const parsedJSON = await processEntry(uri);
      setResult(JSON.stringify(parsedJSON, null, 2));
    } catch (err) {
      console.error('Processing failed', err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Gemini API Test</Text>
      
      <Button 
        title={recording ? "Recording... (auto-stops in 5s)" : "Record 5s Clip"} 
        onPress={startRecording} 
        disabled={!!recording || isProcessing}
      />
      
      {isProcessing && <Text style={styles.status}>Uploading & Processing...</Text>}
      
      <ScrollView style={styles.outputContainer}>
        {error && <Text style={styles.errorText}>ERROR: {error}</Text>}
        {result && <Text style={styles.resultText}>{result}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  status: { marginTop: 20, fontStyle: 'italic', textAlign: 'center' },
  outputContainer: { marginTop: 20, flex: 1, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8 },
  errorText: { color: 'red', fontFamily: 'monospace' },
  resultText: { fontFamily: 'monospace', fontSize: 12 },
});
