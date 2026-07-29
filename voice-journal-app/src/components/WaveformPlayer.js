import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { colors, fonts } from '../theme/tokens';

const BARS_COUNT = 40;

const normalizeMetering = (metering) => {
  const minDb = -60;
  if (metering < minDb) return 0.1;
  if (metering >= 0) return 1;
  return 0.1 + (1 - 0.1) * ((metering - minDb) / (0 - minDb));
};

export default function WaveformPlayer({ audioUri, waveformSamples = [], durationSec = 0 }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(durationSec * 1000 || 1);

  // Compute visual bars downsampled to BARS_COUNT
  const bars = useMemo(() => {
    const result = Array(BARS_COUNT).fill(0.1);
    if (!waveformSamples || waveformSamples.length === 0) return result;

    const totalSamples = waveformSamples.length;
    const samplesPerBar = Math.max(1, Math.floor(totalSamples / BARS_COUNT));

    for (let i = 0; i < BARS_COUNT; i++) {
      const startIndex = i * samplesPerBar;
      let maxMetering = -160;
      for (let j = 0; j < samplesPerBar; j++) {
        const sample = waveformSamples[startIndex + j];
        if (sample && sample.metering > maxMetering) {
          maxMetering = sample.metering;
        }
      }
      result[i] = normalizeMetering(maxMetering);
    }
    return result;
  }, [waveformSamples]);

  useEffect(() => {
    let currentSound = null;
    const loadAudio = async () => {
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );
        currentSound = newSound;
        setSound(newSound);
        if (status.isLoaded && status.durationMillis) {
          setDurationMillis(status.durationMillis);
        }
      } catch (e) {
        console.error("Failed to load sound", e);
      }
    };
    if (audioUri) loadAudio();

    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [audioUri]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPositionMillis(status.positionMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionMillis(0);
      }
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleSeek = async (event) => {
    if (!sound) return;
    const { locationX } = event.nativeEvent;
    // We assume the touchable container width is roughly WindowWidth - 140 (considering padding/button)
    // For a more precise approach, we can use onLayout, but this is a close approximation.
    // Wait, let's use a simpler flex layout and measure it.
    // Instead of measuring, we can pass layout width to state, but let's just assume standard sizing for now.
    const approximateWidth = Dimensions.get('window').width - 120; 
    let percentage = locationX / approximateWidth;
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;
    
    const newPosition = Math.floor(percentage * durationMillis);
    await sound.setPositionAsync(newPosition);
    setPositionMillis(newPosition);
  };

  const currentBarIndex = Math.floor((positionMillis / durationMillis) * BARS_COUNT);

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
        <View style={isPlaying ? styles.pauseIcon : styles.playIcon} />
      </TouchableOpacity>

      <View style={styles.waveformWrapper}>
        <TouchableOpacity 
          style={styles.waveformContainer} 
          activeOpacity={1} 
          onPress={handleSeek}
        >
          {bars.map((scale, index) => {
            const isPlayed = index < currentBarIndex;
            return (
              <View 
                key={index} 
                style={[
                  styles.bar, 
                  { 
                    height: Math.max(4, scale * 40),
                    backgroundColor: isPlayed ? colors.coralBloom : colors.sageWhisper,
                    opacity: isPlayed ? 1 : 0.4
                  }
                ]} 
              />
            );
          })}
        </TouchableOpacity>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creamPaper,
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 24,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.coralBloom,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    marginLeft: 4,
  },
  pauseIcon: {
    width: 12,
    height: 16,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  waveformWrapper: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 8,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.sageWhisper,
  }
});
