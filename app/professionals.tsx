import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/** Mirrors web /(public)/professionals — Hero + Features + Pricing + HowItWorks + CTA. */
const FEATURES = [
  { icon: 'calendar', title: 'Agenda en ligne', desc: 'Moins de rendez-vous manqués, rappels automatiques.' },
  { icon: 'shield-checkmark', title: 'Profil vérifié', desc: 'Visible dans 50+ villes au Maroc.' },
  { icon: 'card', title: 'Devis & factures', desc: 'Devis, factures et suivi des règlements.' },
  { icon: 'star', title: 'Avis patients', desc: 'Des avis qui bâtissent votre réputation.' },
];

const STEPS = [
  { title: 'Créez votre profil', desc: 'Inscrivez-vous et faites vérifier votre licence.' },
  { title: 'Ajoutez vos services', desc: 'Prestations, prix, durées et lieux.' },
  { title: 'Recevez des patients', desc: 'Agenda rempli sans y penser.' },
];

export default function ProfessionalsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-4">
          <Text className="text-sm font-semibold text-primary">ESPACE PROFESSIONNEL</Text>
          <Text className="mt-2 text-3xl font-bold text-dark">Remplissez votre agenda sans y penser</Text>
          <Text className="mt-2 text-sm leading-5 text-grayText">
            La plateforme qui gère votre cabinet pendant que vous soignez.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register?role=professional')}
            className="mt-5 rounded-full bg-primary py-3.5"
          >
            <Text className="text-center text-base font-semibold text-white">Créer mon profil pro</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8 px-5">
          <Text className="text-xl font-semibold text-dark">Tout votre cabinet, au même endroit</Text>
          <View className="mt-4 gap-3">
            {FEATURES.map((f) => (
              <View key={f.title} className="flex-row items-start rounded-panel border border-hairline bg-white p-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name={f.icon as any} size={20} color="#F53E8A" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-dark">{f.title}</Text>
                  <Text className="mt-0.5 text-xs leading-4 text-grayText">{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-8 px-5">
          <Text className="text-xl font-semibold text-dark">Comment ça marche</Text>
          <View className="mt-4">
            {STEPS.map((s, i) => (
              <View key={s.title} className="flex-row">
                <View className="items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                    <Text className="text-sm font-bold text-white">{i + 1}</Text>
                  </View>
                  {i < STEPS.length - 1 && <View className="w-px flex-1 bg-hairline" />}
                </View>
                <View className="mb-6 flex-1 pl-4">
                  <Text className="text-base font-semibold text-dark">{s.title}</Text>
                  <Text className="mt-1 text-sm text-grayText">{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/professional')}
            className="mt-2 rounded-full border border-primary py-3.5"
          >
            <Text className="text-center text-base font-semibold text-primary">Commencer l'onboarding</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
