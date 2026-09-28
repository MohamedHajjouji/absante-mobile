import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import './global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <RootContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootContent() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FEFBFC' },
      }}
    >
      {/* `app/index.tsx` redirects `/` → `/(tabs)` so cold starts never
          land on `+not-found`. It must stay registered here. */}
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(professional)" />
      <Stack.Screen name="(erp)" />
      <Stack.Screen name="doctor" />
      <Stack.Screen name="booking" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}