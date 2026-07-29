import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { useRecording } from '../context/RecordingContext';
import { colors, fonts } from '../theme/tokens';

const normalizeMetering = (metering) => {
  const minDb = -60;
  if (metering < minDb) return 0.1;
  if (metering >= 0) return 1;
  return 0.1 + (1 - 0.1) * ((metering - minDb) / (0 - minDb));
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function RecordButton() {
  const { isRecording, startRecording, stopRecording, elapsedTime, currentMetering, permissionError } = useRecording();
  
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const barHeights = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.4),
    new Animated.Value(0.6),
    new Animated.Value(0.4),
    new Animated.Value(0.2),
  ]).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (isRecording && !reduceMotion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [isRecording, reduceMotion]);

  useEffect(() => {
    if (isRecording) {
      const targetScale = normalizeMetering(currentMetering);
      const animations = barHeights.map((anim) => {
        const randomFactor = 0.5 + Math.random() * 0.8;
        let finalScale = targetScale * randomFactor;
        if (finalScale < 0.1) finalScale = 0.1;
        if (finalScale > 1.2) finalScale = 1.2;
        
        return Animated.spring(anim, {
          toValue: finalScale,
          useNativeDriver: true,
          speed: 12,
        });
      });
      Animated.parallel(animations).start();
    } else {
      const resetAnimations = barHeights.map((anim, index) => {
        // Create a static idle waveform icon pattern
        const idleScales = [0.2, 0.4, 0.6, 0.4, 0.2];
        return Animated.spring(anim, {
          toValue: idleScales[index],
          useNativeDriver: true,
        });
      });
      Animated.parallel(resetAnimations).start();
    }
  }, [currentMetering, isRecording]);

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {isRecording && (
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulseAnim }], opacity: reduceMotion ? 0.3 : undefined }
            ]}
          />
        )}
        
        <TouchableOpacity 
          style={styles.recordButton} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={styles.waveformContainer}>
            {barHeights.map((anim, index) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.waveformBar, 
                  { transform: [{ scaleY: anim }] }
                ]} 
              />
            ))}
          </View>
        </TouchableOpacity>
      </View>

      {permissionError && (
        <Text style={styles.errorText}>{permissionError}</Text>
      )}

      {isRecording && (
        <View style={styles.statusContainer}>
          <Text style={styles.recordingLabel}>Recording — tap to stop</Text>
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  buttonWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.coralBloom,
    opacity: 0.4,
  },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.coralBloom,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  waveformBar: {
    width: 6,
    height: 32, // Max height
    backgroundColor: colors.creamPaper,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  statusContainer: {
    alignItems: 'center',
  },
  recordingLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkPlum,
    marginBottom: 8,
    opacity: 0.8,
  },
  timerText: {
    fontFamily: fonts.mono,
    fontSize: 24,
    color: colors.inkPlum,
  },
  errorText: {
    fontFamily: fonts.body,
    color: '#D32F2F',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 10,
  }
});
