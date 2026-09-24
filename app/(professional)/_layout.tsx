import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SplashScreen } from '@/components/ui/SplashScreen';

const ACTIVE_TINT = '#F53E8A';
const INACTIVE_TINT = '#6a6a6a';

export default function ProfessionalLayout() {
  const { isLoaded, isSignedIn, role, needsOnboarding } = useAuth();

  if (!isLoaded) {
    return <SplashScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(onboarding)/professional" />;
  }

  // Patients never reach the professional shell
  if (role === 'patient') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: INACTIVE_TINT,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F2',
          height: 84,
          paddingTop: 10,
          paddingBottom: 20,
          shadowColor: '#3D4B64',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          alignItems: 'center',
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <View className="items-center justify-center">
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size, focused }) => (
            <View className="items-center justify-center">
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, size, focused }) => (
            <View className="items-center justify-center">
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size, focused }) => (
            <View className="items-center justify-center">
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <View className="items-center justify-center">
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
