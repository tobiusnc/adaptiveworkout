import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

import { OpSqliteStorageService } from '../src/storage/OpSqliteStorageService';
import { useAppStore } from '../src/store/useAppStore';

export default function RootLayout(): React.JSX.Element {
  const initialize = useAppStore((s) => s.initialize);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const initError = useAppStore((s) => s.initError);

  useEffect(() => {
    void NavigationBar.setVisibilityAsync('hidden');
  }, []);

  useEffect(() => {
    const service = new OpSqliteStorageService();
    // initialize() handles its own errors — sets initError in store on failure.
    void initialize(service);
  }, [initialize]);

  if (initError !== null) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={styles.centred}>
            <Text style={styles.errorTitle}>Failed to start app</Text>
            <Text style={styles.errorBody}>{initError}</Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  if (isInitializing) {
    // Blank screen during init — revisit if startup latency is noticeable.
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={styles.blank} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Adaptive Workout' }} />
          <Stack.Screen name="onboarding" options={{ title: 'Get Started', headerBackVisible: false }} />
          <Stack.Screen name="session/[id]" options={{ title: 'Session', headerBackVisible: false }} />
          <Stack.Screen name="session/feedback" options={{ title: 'Feedback', headerBackVisible: false }} />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // GestureHandlerRootView must fill the entire screen so gesture detection
  // works across the full viewport — analogous to a root window in GUI frameworks.
  gestureRoot: {
    flex: 1,
  },
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
