import React, { createContext, useContext, useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { createEntry, updateEntry, createReflection } from '../db/entries';
import { processEntry } from '../services/gemini';
import NetInfo from '@react-native-community/netinfo';

const RecordingContext = createContext(null);

export const RecordingProvider = ({ children }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeRecording, setActiveRecording] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMetering, setCurrentMetering] = useState(-160);
  const [permissionError, setPermissionError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pollingIntervalRef = useRef(null);
  const waveformSamplesRef = useRef([]);

  const startRecording = async () => {
    if (isRecording || activeRecording) return;
    setPermissionError(null);

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionError('Microphone permission is required to record journal entries.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const options = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording } = await Audio.Recording.createAsync(options);

      setActiveRecording(recording);
      setIsRecording(true);
      setElapsedTime(0);
      setCurrentMetering(-160);
      waveformSamplesRef.current = [];

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording) {
            setElapsedTime(Math.floor(status.durationMillis / 1000));
            if (status.metering !== undefined) {
              setCurrentMetering(status.metering);
              waveformSamplesRef.current.push({
                time: status.durationMillis,
                metering: status.metering
              });
            }
          }
        } catch (err) {
          // ignore status read errors if it unloads
        }
      }, 100);
    } catch (err) {
      console.error('Failed to start recording', err);
      setPermissionError('Failed to start the microphone. ' + err.message);
      setIsRecording(false);
      setActiveRecording(null);
    }
  };

  const stopRecording = async () => {
    if (!activeRecording) return;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      await activeRecording.stopAndUnloadAsync();
      const tempUri = activeRecording.getURI();
      const status = await activeRecording.getStatusAsync();
      const durationMillis = status.durationMillis || 0;
      const durationSec = Math.floor(durationMillis / 1000);
      
      setIsRecording(false);
      setActiveRecording(null);
      setCurrentMetering(-160);
      
      if (!tempUri) throw new Error("No temporary URI returned from recording");

      // Move from cache to persistent DocumentDirectory
      const filename = `journal_${Date.now()}.m4a`;
      const persistentUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.moveAsync({
        from: tempUri,
        to: persistentUri
      });

      const samples = [...waveformSamplesRef.current];

      // Kick off background processing
      processRecordingJob(persistentUri, durationSec, samples);

    } catch (err) {
      console.error('Failed to stop recording cleanly', err);
      setIsRecording(false);
      setActiveRecording(null);
    }
  };

  const processRecordingJob = async (persistentUri, durationSec, samples) => {
    setIsProcessing(true);
    let entryId = null;
    try {
      entryId = await createEntry({
        audio_uri: persistentUri,
        duration_sec: durationSec,
        status: 'pending',
        waveform_samples: samples
      });

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        await updateEntry(entryId, { transcript: 'Waiting for connection to process...' });
        setIsProcessing(false);
        return; // Leave it as pending
      }

      await updateEntry(entryId, { status: 'transcribing' });

      const reflectionData = await processEntry(persistentUri);

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

    } catch (error) {
      console.error('Background processing failed', error);
      if (entryId) {
        let errorType = 'Processing Error';
        if (error.message.includes('RateLimitError')) errorType = 'Rate Limit Exceeded';
        else if (error.message.includes('InvalidKeyError')) errorType = 'Invalid API Key';
        else if (error.message.includes('NetworkError')) errorType = 'Network Connection Failed';
        else if (error.message.includes('ParseError')) errorType = 'Failed to parse AI response';
        else if (error.message.includes('GeminiAPIError')) errorType = 'Gemini API Error';
        
        await updateEntry(entryId, { 
          status: 'error',
          transcript: errorType + ': ' + error.message
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const retryStuckEntries = async () => {
    try {
      // Import getStuckEntries locally to avoid circular dependencies if any, though it's already imported at top? No, I need to add it to the import.
      // Wait, let me just add it to the imports at the top first, but for now I'll use it if I add it.
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <RecordingContext.Provider value={{
      isRecording,
      elapsedTime,
      currentMetering,
      permissionError,
      isProcessing,
      startRecording,
      stopRecording,
      processRecordingJob
    }}>
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = () => useContext(RecordingContext);
