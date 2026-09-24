import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn, role, needsOnboarding, user } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  // Not signed in → go to auth
  if (!isSignedIn || !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // No onboarding needed → go to the role-appropriate area
  if (!needsOnboarding) {
    return role === 'professional' ? (
      <Redirect href="/(professional)" />
    ) : (
      <Redirect href="/(tabs)" />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FEFBFC' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="professional" />
      <Stack.Screen name="client" />
      <Stack.Screen name="completion" />
    </Stack>
  );
}