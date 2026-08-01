import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LockContext = createContext(null);

export const LockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const checkInitialState = async () => {
      try {
        const passcode = await SecureStore.getItemAsync('app_passcode');
        if (passcode) {
          setIsLockEnabled(true);
          setIsLocked(true);
        } else {
          setIsLockEnabled(false);
          setIsLocked(false);
        }
      } catch (e) {
        console.error("Failed to read secure store", e);
      } finally {
        setIsReady(true);
      }
    };
    
    checkInitialState();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) && 
        nextAppState.match(/inactive|background/)
      ) {
        if (isLockEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isLockEnabled]);

  const unlockApp = () => {
    setIsLocked(false);
  };

  const enableLock = async (passcode) => {
    await SecureStore.setItemAsync('app_passcode', passcode);
    setIsLockEnabled(true);
  };

  const disableLock = async () => {
    await SecureStore.deleteItemAsync('app_passcode');
    setIsLockEnabled(false);
    setIsLocked(false);
  };

  return (
    <LockContext.Provider value={{
      isLocked,
      isLockEnabled,
      isReady,
      unlockApp,
      enableLock,
      disableLock,
      lockApp: () => {
        if (isLockEnabled) setIsLocked(true);
      }
    }}>
      {children}
    </LockContext.Provider>
  );
};

export const useLock = () => useContext(LockContext);
