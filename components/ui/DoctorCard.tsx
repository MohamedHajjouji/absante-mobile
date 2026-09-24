import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface Doctor {
  name: string;
  specialty: string;
  rating: string;
  location?: string;
  experience?: string;
}

interface DoctorCardProps {
  doctor: Doctor;
  onPress?: () => void;
  ctaLabel?: string;
}

const SPECIALTY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Cardiologue: { icon: 'heart', color: '#F53E8A', bg: '#fdf2f8' },
  Dentiste: { icon: 'medkit', color: '#0D61B6', bg: '#ecf2fa' },
  Ophtalmologue: { icon: 'eye', color: '#3578FF', bg: '#eff6ff' },
  Ophtalmo: { icon: 'eye', color: '#3578FF', bg: '#eff6ff' },
  Dermatologue: { icon: 'pulse', color: '#0D61B6', bg: '#ecf2fa' },
  Pédiatre: { icon: 'basket', color: '#3578FF', bg: '#eff6ff' },
  Généraliste: { icon: 'body', color: '#F53E8A', bg: '#fdf2f8' },
};

/**
 * Airbnb-adapted listing card: 4:3 "photography" tile (rounded 14px),
 * rating badge overlaid top-right, metadata stacked with tight 4–8px gaps
 * below the image, and a pink CTA. No container shadow — whitespace + the
 * image radius do the separation work.
 */
export function DoctorCard({ doctor, onPress, ctaLabel = 'Voir' }: DoctorCardProps) {
  const meta = SPECIALTY_META[doctor.specialty] ?? {
    icon: 'medkit' as const,
    color: '#0D61B6',
    bg: '#ecf2fa',
  };

  return (
    <Pressable
      className="w-64"
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.9 }}
      accessibilityRole="button"
      accessibilityLabel={`${doctor.name} — ${doctor.specialty}`}
    >
      {/* 4:3 photography tile */}
      <View className="relative aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-listing"
        style={{ backgroundColor: meta.bg }}
      >
        <Ionicons name={meta.icon} size={52} color={meta.color} />
        {/* Rating badge overlay */}
        <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-white px-2 py-1 shadow-pill">
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text className="text-xs font-semibold text-dark">{doctor.rating}</Text>
        </View>
      </View>

      {/* Metadata — tight 4–8px gaps */}
      <View className="mt-3 px-1">
        <View className="flex-row items-center gap-1">
          <Ionicons name="shield-checkmark" size={13} color="#0D61B6" />
          <Text className="text-xs font-medium text-secondary-tone">Médecin vérifié</Text>
        </View>

        <Text className="mt-1.5 text-base font-semibold text-dark">{doctor.name}</Text>
        <Text className="mt-0.5 text-sm font-medium text-grayText">{doctor.specialty}</Text>

        {doctor.location && (
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={12} color="#929292" />
            <Text className="text-xs text-grayText">{doctor.location}</Text>
          </View>
        )}

        <View className="mt-3">
          <Pressable
            className="self-start rounded-lg bg-primary px-4 py-2"
            style={({ pressed }) => pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${ctaLabel} ${doctor.name}`}
          >
            <Text className="text-sm font-medium text-white">{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}