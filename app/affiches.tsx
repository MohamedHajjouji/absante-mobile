import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface Affiche {
  id: string;
  label: string;
  description: string;
  kicker: string;
  title: string;
  subtitle: string;
  steps: string[];
  footer: string;
  rtl?: boolean;
}

/** Same content as web lib/affiches/specs.ts — boutique excluded for now. */
const AFFICHES: Affiche[] = [
  {
    id: 'patients',
    label: "Salle d'attente — Patients",
    description: "Rendez-vous en ligne en 3 étapes. À afficher en salle d'attente et à l'accueil.",
    kicker: 'RENDEZ-VOUS EN LIGNE',
    title: 'Votre médecin, à portée de main',
    subtitle: 'Prenez rendez-vous en ligne — sans appeler, sans attendre.',
    steps: [
      "Téléchargez l'application AB Santé",
      'Choisissez votre médecin et votre créneau',
      'Recevez confirmation et rappels automatiques',
    ],
    footer: '50+ villes couvertes au Maroc',
  },
  {
    id: 'patients-ar',
    label: 'Salle d\'attente — Patients (arabe)',
    description: 'La même affiche patients, en arabe.',
    kicker: 'المواعيد عبر الإنترنت',
    title: 'طبيبك، في متناول يدك',
    subtitle: 'احجز موعدك عبر الإنترنت — بدون اتصال، بدون انتظار.',
    steps: ['حمّل تطبيق AB Santé', 'اختر طبيبك وموعدك', 'استلم التأكيد والتذكيرات التلقائية'],
    footer: 'أكثر من 50 مدينة في المغرب',
    rtl: true,
  },
  {
    id: 'medecins',
    label: 'Recrutement — Médecins',
    description: "Convaincre les praticiens de rejoindre l'Espace Professionnel.",
    kicker: 'ESPACE PROFESSIONNEL',
    title: 'Remplissez votre agenda sans y penser',
    subtitle: 'La plateforme qui gère votre cabinet pendant que vous soignez.',
    steps: [
      'Profil vérifié visible dans 50+ villes',
      'Agenda en ligne — moins de rendez-vous manqués',
      'Devis, factures et suivi des règlements',
      'Avis patients qui bâtissent votre réputation',
    ],
    footer: 'AB Santé — le cabinet réuni au même endroit',
  },
];

export default function AffichesScreen() {
  const [printingId, setPrintingId] = useState<string | null>(null);

  const handlePrint = async (a: Affiche) => {
    setPrintingId(a.id);
    try {
      const html = `
        <html><body style="font-family:sans-serif;padding:40px;${a.rtl ? 'direction:rtl;text-align:right;' : ''}">
          <p style="color:#F53E8A;font-weight:bold;letter-spacing:2px;">${a.kicker}</p>
          <h1 style="font-size:32px;">${a.title}</h1>
          <p style="color:#555;">${a.subtitle}</p>
          <ol>${a.steps.map((s) => `<li style="margin:8px 0;font-size:16px;">${s}</li>`).join('')}</ol>
          <p style="margin-top:30px;color:#0D61B6;font-weight:bold;">www.absante.ma</p>
          <p style="color:#888;">${a.footer}</p>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('OK', `Affiche générée : ${uri}`);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible de générer l'affiche.");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-4">
          <Text className="text-2xl font-bold text-dark">Affiches</Text>
          <Text className="mt-1 text-sm text-grayText">Comme /affiches sur le web (boutique exclue).</Text>
        </View>
        <View className="mt-4 gap-4 px-5">
          {AFFICHES.map((a) => (
            <View key={a.id} className="rounded-panel border border-hairline bg-white p-5 shadow-panel">
              <Text className="text-xs font-bold text-primary">{a.kicker}</Text>
              <Text className="mt-2 text-xl font-bold text-dark">{a.title}</Text>
              <Text className="mt-1 text-sm text-grayText">{a.subtitle}</Text>
              <View className="mt-3 gap-1.5">
                {a.steps.map((s, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Text className="text-[11px] font-bold text-white">{i + 1}</Text>
                    </View>
                    <Text className="flex-1 text-sm text-dark">{s}</Text>
                  </View>
                ))}
              </View>
              <Text className="mt-3 text-xs text-grayText">{a.footer}</Text>
              <TouchableOpacity
                onPress={() => handlePrint(a)}
                disabled={printingId === a.id}
                className="mt-4 flex-row items-center justify-center rounded-lg bg-primary py-3"
              >
                {printingId === a.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={16} color="#fff" />
                    <Text className="ml-2 text-sm font-semibold text-white">Imprimer / Partager</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
