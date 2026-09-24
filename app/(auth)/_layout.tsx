import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  // Authenticated users should not see the auth flow.
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FEFBFC' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="callback" />
    </Stack>
  );
}
