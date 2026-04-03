import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout(): React.JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Adaptive Workout' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
      <Stack.Screen name="session/feedback" options={{ title: 'Feedback' }} />
    </Stack>
  );
}
