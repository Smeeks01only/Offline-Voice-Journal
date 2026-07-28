import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createEntry } from '../api/client';

const RecordingContext = createContext();

export function useRecording() {
  return useContext(RecordingContext);
}

export function RecordingProvider({ children }) {
  const [status, setStatus] = useState('idle'); // idle, recording, uploading
  const [errorMsg, setErrorMsg] = useState('');
  const [barHeights, setBarHeights] = useState([10, 20, 15, 25, 10]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastCreatedEntry, setLastCreatedEntry] = useState(null);

  const mediaRecorder = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const dataArray = useRef(null);
  const streamRef = useRef(null);
  const animationFrameId = useRef(null);
  const timerId = useRef(null);

  useEffect(() => {
    return () => {
      stopMediaTracks();
    };
  }, []);

  const stopMediaTracks = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (timerId.current) clearInterval(timerId.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close();
    }
  };

  const drawWaveform = () => {
    if (!analyser.current) return;
    
    // We use time domain data to calculate peak amplitude which is much more reactive to raw speech volume
    analyser.current.getByteTimeDomainData(dataArray.current);
    
    const bars = 5;
    const step = Math.floor(dataArray.current.length / bars);
    const newHeights = [];
    
    for (let i = 0; i < bars; i++) {
      let maxDev = 0;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(dataArray.current[i * step + j] - 128);
        if (val > maxDev) maxDev = val;
      }
      
      // maxDev is 0-128. Scale to 0-1 aggressively.
      const normalized = Math.min(1, maxDev / 64);
      // Map to height 5px to 40px
      const height = 5 + (normalized * 35);
      newHeights.push(height);
    }
    
    setBarHeights(newHeights);
    animationFrameId.current = requestAnimationFrame(drawWaveform);
  };

  const startRecording = async () => {
    if (status !== 'idle') return;
    setErrorMsg('');
    setElapsedTime(0);
    setLastCreatedEntry(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 512;
      source.connect(analyser.current);
      
      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);
      
      drawWaveform();

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      const chunks = [];
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        stopMediaTracks();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setStatus('uploading');
        setBarHeights([10, 20, 15, 25, 10]); 
        
        try {
          const entry = await createEntry(blob);
          setLastCreatedEntry(entry);
          setStatus('idle');
        } catch (err) {
          setErrorMsg(err.message || 'Failed to upload recording');
          setStatus('idle');
        }
      };
      
      recorder.start();
      setStatus('recording');
      
      // Start elapsed timer
      timerId.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Microphone access is needed to record.');
      } else {
        setErrorMsg('Error accessing microphone: ' + err.message);
      }
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  };

  return (
    <RecordingContext.Provider value={{
      status,
      errorMsg,
      barHeights,
      elapsedTime,
      lastCreatedEntry,
      startRecording,
      stopRecording
    }}>
      {children}
    </RecordingContext.Provider>
  );
}
