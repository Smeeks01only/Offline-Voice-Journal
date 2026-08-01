import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { colors, fonts } from '../theme/tokens';
import { useLock } from '../context/LockContext';

const PASSCODE_LENGTH = 4;

export default function LockScreen({ mode = 'unlock', onSetupComplete, onCancelSetup }) {
  const { unlockApp, enableLock } = useLock();
  
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState(mode === 'setup' ? 'create' : 'unlock');
  const [error, setError] = useState(null);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(mode === 'unlock');
  
  useEffect(() => {
    if (mode === 'unlock') {
      const timer = setTimeout(() => {
        checkBiometrics();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        promptBiometrics();
      } else {
        setIsCheckingBiometrics(false);
      }
    } catch (e) {
      console.error(e);
      setIsCheckingBiometrics(false);
    }
  };

  const promptBiometrics = async () => {
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Voice Journal',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        unlockApp();
      } else {
        setIsCheckingBiometrics(false);
      }
    } catch (e) {
      console.error(e);
      setIsCheckingBiometrics(false);
    }
  };

  const handleKeyPress = async (val) => {
    setError(null);
    
    if (step === 'create') {
      const newVal = passcode + val;
      setPasscode(newVal);
      if (newVal.length === PASSCODE_LENGTH) {
        setTimeout(() => {
          setStep('confirm');
        }, 150);
      }
    } else if (step === 'confirm') {
      const newVal = confirmPasscode + val;
      setConfirmPasscode(newVal);
      if (newVal.length === PASSCODE_LENGTH) {
        if (newVal === passcode) {
          await enableLock(passcode);
          if (onSetupComplete) onSetupComplete();
        } else {
          setError('Passcodes do not match. Try again.');
          setPasscode('');
          setConfirmPasscode('');
          setStep('create');
        }
      }
    } else if (step === 'unlock') {
      const newVal = passcode + val;
      setPasscode(newVal);
      if (newVal.length === PASSCODE_LENGTH) {
        const storedPasscode = await SecureStore.getItemAsync('app_passcode');
        if (storedPasscode === newVal) {
          unlockApp();
        } else {
          setError('Incorrect passcode');
          setPasscode('');
        }
      }
    }
  };

  const handleDelete = () => {
    setError(null);
    if (step === 'create') {
      setPasscode(passcode.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPasscode(confirmPasscode.slice(0, -1));
    } else if (step === 'unlock') {
      setPasscode(passcode.slice(0, -1));
    }
  };

  const renderDots = () => {
    let currentCode = passcode;
    if (step === 'confirm') currentCode = confirmPasscode;
    
    const dots = [];
    for (let i = 0; i < PASSCODE_LENGTH; i++) {
      const isFilled = i < currentCode.length;
      dots.push(
        <View key={i} style={[styles.dot, isFilled && styles.dotFilled]} />
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  const renderPad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'DEL']
    ];

    return (
      <View style={styles.padContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.padRow}>
            {row.map((key) => {
              if (key === '') {
                return <View key="empty" style={styles.padKey} />;
              }
              if (key === 'DEL') {
                return (
                  <TouchableOpacity key="del" style={styles.padKey} onPress={handleDelete} activeOpacity={0.7}>
                    <Text style={styles.padKeyText}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={key} style={styles.padKey} onPress={() => handleKeyPress(key)} activeOpacity={0.7}>
                  <Text style={styles.padKeyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  if (isCheckingBiometrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.appName}>Voice Journal</Text>
          <ActivityIndicator size="large" color={colors.paperWhite} style={{ marginTop: 40 }} />
          <TouchableOpacity style={styles.fallbackButton} onPress={() => setIsCheckingBiometrics(false)}>
            <Text style={styles.fallbackText}>Use Passcode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  let title = 'Enter Passcode';
  if (step === 'create') title = 'Create Passcode';
  if (step === 'confirm') title = 'Confirm Passcode';

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'setup' && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancelSetup}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.content}>
        <Text style={styles.appName}>Voice Journal</Text>
        <Text style={styles.title}>{title}</Text>
        
        {renderDots()}
        
        <Text style={styles.errorText}>{error || ' '}</Text>
        
        {renderPad()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.obsidian,
  },
  cancelButton: {
    padding: 16,
    alignSelf: 'flex-start',
  },
  cancelText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: -40,
  },
  appName: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.paperWhite,
    marginBottom: 40,
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.slateGray,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slateGray,
    marginHorizontal: 12,
  },
  dotFilled: {
    backgroundColor: colors.paperWhite,
    borderColor: colors.paperWhite,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.errorRed,
    marginBottom: 30,
    height: 20,
  },
  padContainer: {
    width: 280,
  },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  padKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  padKeyText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.paperWhite,
  },
  fallbackButton: {
    marginTop: 40,
    padding: 16,
  },
  fallbackText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.slateGray,
    textDecorationLine: 'underline',
  }
});
