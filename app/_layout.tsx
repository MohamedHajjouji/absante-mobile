import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';
import './global.css';
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
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