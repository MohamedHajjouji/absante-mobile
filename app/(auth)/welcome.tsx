import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { BrandLogo } from '@/components/ui/BrandLogo';

interface RoleCardProps {
  icon: keyof typeof FontAwesome6.glyphMap;
  iconColor: string;
  backgroundClass: string;
  iconBackgroundClass: string;
  title: string;
  description: string;
  onPress: () => void;
}

function RoleCard({
  icon,
  iconColor,
  backgroundClass,
  iconBackgroundClass,
  title,
  description,
  onPress,
}: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mt-3 min-h-[126px] flex-row items-center rounded-panel border-hairline px-[18px] py-5 shadow-panel ${backgroundClass}`}
      style={({ pressed }) =>
        pressed
          ? {
              opacity: 0.88,
              transform: [{ scale: 0.985 }],
            }
          : undefined
      }
    >
      {/* Icon */}
      <View
        className={`mr-4 h-[80px] w-[80px] items-center justify-center rounded-full ${iconBackgroundClass}`}
      >
        <FontAwesome6 name={icon} size={36} color={iconColor} />
      </View>

      {/* Text */}
      <View className="flex-1">
        <Text className="text-base font-semibold leading-[21px] tracking-[-0.15px] text-dark">
          {title}
        </Text>

        <Text className="mt-[7px] text-sm font-normal leading-[19px] text-grayText">
          {description}
        </Text>
      </View>

      {/* Arrow */}
      <View
        className="ml-2 h-[30px] w-[30px] items-center justify-center rounded-full"
        style={{ backgroundColor: `${iconColor}10` }}
      >
        <FontAwesome6
          name="chevron-right"
          size={13}
          color={iconColor}
        />
      </View>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 overflow-hidden bg-[#FCFBFD]">
      {/* Soft atmospheric background */}
      <View
        pointerEvents="none"
        className="absolute -right-[125px] -top-[170px] h-[300px] w-[300px] rounded-full bg-[#EEF6FF] opacity-70"
      />

      <View
        pointerEvents="none"
        className="absolute -bottom-[190px] -left-[145px] h-[300px] w-[300px] rounded-full bg-[#FFF0F7] opacity-75"
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[22px] pb-[38px] pt-6"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Brand */}
        <View className="mt-1 mb-1 items-center">
          <BrandLogo variant="navbar" width={150} height={150} />
        </View>

        {/* Headline */}
        <View className="mt-1 items-center px-[10px]">
          <Text className="text-[36px] font-semibold leading-[43px] tracking-[-1.1px] text-dark">
            Bienvenue
          </Text>

          <Text className="mt-[7px] text-[17px] font-medium leading-6 text-primary">
            Votre santé, au cœur de tout.
          </Text>

          <View className="mb-[15px] mt-[17px] h-[3px] w-[34px] rounded-full bg-primary" />

          <Text className="max-w-[340px] text-center text-[14px] font-normal leading-[21px] text-grayText">
            La plateforme qui connecte patients et professionnels de santé
            au Maroc.
          </Text>
        </View>

        {/* Role Selection */}
        <View className="mt-[34px]">
          <Text className="mb-[13px] text-center text-[15px] font-semibold leading-[21px] text-dark">
            Comment souhaitez-vous continuer ?
          </Text>

          <RoleCard
            icon="user-large"
            iconColor="#F53E8A"
            backgroundClass="bg-white"
            iconBackgroundClass="bg-primary-50"
            title="Patient / Client"
            description="Trouvez un médecin, une pharmacie ou un établissement de santé près de chez vous."
            onPress={() => router.push('/(auth)/register?role=client')}
          />

          <RoleCard
            icon="user-doctor"
            iconColor="#3578FF"
            backgroundClass="bg-white"
            iconBackgroundClass="bg-secondary-50"
            title="Professionnel de santé"
            description="Gérez votre activité et recevez vos rendez-vous en toute simplicité."
            onPress={() =>
              router.push('/(auth)/register?role=professional')
            }
          />
        </View>

        {/* Trust */}
        <View className="mt-[30px] items-center">
          <View className="mb-[9px] h-[38px] w-[38px] items-center justify-center rounded-full bg-secondary-50">
            <FontAwesome6
              name="shield-heart"
              size={17}
              color="#3578FF"
            />
          </View>

          <Text className="text-[12.5px] font-medium leading-[19px] text-grayText">
            Vos données sont{' '}
            <Text className="font-semibold text-secondary-tone">sécurisées</Text>
          </Text>

          <Text className="mt-[1px] text-[11.5px] leading-[17px] text-grayText">
            Confidentialité garantie.
          </Text>
        </View>

        {/* Guest entry */}
        <View className="mt-[22px] items-center">
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="w-full items-center rounded-full border border-hairline bg-white px-6 py-4 shadow-panel"
          >
            <Text className="text-sm font-semibold text-dark">
              Continuer en invité
            </Text>
          </Pressable>
          <Text className="mt-2 text-center text-[11.5px] leading-[17px] text-grayText">
            Découvrez l'app — la connexion n'est demandée qu'au moment de réserver.
          </Text>
        </View>

        {/* Login */}
        <View className="mt-[18px] items-center">
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-[13px] font-medium leading-5 text-grayText">
                Déjà un compte ?{' '}
                <Text className="font-semibold text-primary">
                  Connectez-vous
                </Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
