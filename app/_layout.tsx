import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import { OpSqliteStorageService } from '../src/storage/OpSqliteStorageService';
import { useAppStore } from '../src/store/useAppStore';

export default function RootLayout(): React.JSX.Element {
  const initialize = useAppStore((s) => s.initialize);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const initError = useAppStore((s) => s.initError);

  useEffect(() => {
    const service = new OpSqliteStorageService();
    // initialize() handles its own errors — sets initError in store on failure.
    void initialize(service);
  }, [initialize]);

  if (initError !== null) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorTitle}>Failed to start app</Text>
        <Text style={styles.errorBody}>{initError}</Text>
      </View>
    );
  }

  if (isInitializing) {
    // Blank screen during init — revisit if startup latency is noticeable.
    return <View style={styles.blank} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Adaptive Workout' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Get Started', headerBackVisible: false }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
      <Stack.Screen name="session/feedback" options={{ title: 'Feedback' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    textAlign: 'center',
  },
});
