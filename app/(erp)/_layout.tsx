import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

/**
 * ERP shell — reserved for agency owners (`profiles.role === 'admin'`).
 * Mirrors the `(professional)` guard pattern.
 */
export default function ErpLayout() {
  const { isLoaded, isSignedIn, isAdmin } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Non-owners never reach the ERP shell.
  if (!isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FEFBFC' },
      }}
    />
  );
}
