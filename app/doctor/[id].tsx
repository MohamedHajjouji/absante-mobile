import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getProviderDetail,
  getProviderServicesForBooking,
  ProviderDetail,
  ProviderServiceItem,
} from '@/lib/services/patient-service';

const SPECIALTY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  Cardiologue: { icon: 'heart', color: '#F53E8A', bg: '#fdf2f8' },
  Dentiste: { icon: 'medkit', color: '#0D61B6', bg: '#ecf2fa' },
  Ophtalmologue: { icon: 'eye', color: '#3578FF', bg: '#eff6ff' },
  Dermatologue: { icon: 'pulse', color: '#0D61B6', bg: '#ecf2fa' },
  Pédiatre: { icon: 'basket', color: '#3578FF', bg: '#eff6ff' },
  Généraliste: { icon: 'body', color: '#F53E8A', bg: '#fdf2f8' },
};

function getMeta(specialty: string) {
  return SPECIALTY_META[specialty] ?? { icon: 'medkit' as const, color: '#0D61B6', bg: '#ecf2fa' };
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  treatment: 'Traitement',
  examination: 'Examen',
  laboratory: 'Laboratoire',
  radiology: 'Radiologie',
  vaccination: 'Vaccination',
  other: 'Autre',
};

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [detail, svcs] = await Promise.all([
        getProviderDetail(id),
        getProviderServicesForBooking(id),
      ]);
      setProvider(detail);
      setServices(svcs);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <Ionicons name="alert-circle-outline" size={48} color="#929292" />
        <Text className="mt-4 text-base font-medium text-grayText">
          Médecin introuvable
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 rounded-lg bg-primary px-6 py-3"
        >
          <Text className="text-sm font-medium text-white">Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = getMeta(provider.specialty);

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={{ borderWidth: 1, borderColor: '#F2F2F2' }}
          >
            <Ionicons name="chevron-back" size={22} color="#3D4B64" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-dark">Profil médecin</Text>
          <View className="h-11 w-11" />
        </View>

        {/* Provider Hero */}
        <View className="mt-6 items-center px-5">
          <View
            className="h-24 w-24 items-center justify-center rounded-full"
            style={{ backgroundColor: meta.bg }}
          >
            <Ionicons name={meta.icon} size={44} color={meta.color} />
          </View>

          <Text className="mt-4 text-2xl font-semibold tracking-[-0.3px] text-dark">
            Dr {provider.firstName} {provider.lastName}
          </Text>
          <Text className="mt-1 text-sm font-medium text-grayText">
            {provider.specialty}
          </Text>

          {/* Verified badge */}
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="shield-checkmark" size={14} color="#0D61B6" />
            <Text className="text-xs font-medium text-secondary-tone">
              Médecin vérifié
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="mx-5 mt-6 flex-row gap-3">
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text className="mt-1.5 text-lg font-semibold text-dark">
              {provider.rating.toFixed(1)}
            </Text>
            <Text className="text-xs text-grayText">
              {provider.reviewCount} avis
            </Text>
          </View>
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="time-outline" size={20} color="#0D61B6" />
            <Text className="mt-1.5 text-lg font-semibold text-dark">
              {provider.yearsOfExperience ?? '—'}
            </Text>
            <Text className="text-xs text-grayText">Années exp.</Text>
          </View>
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="location-outline" size={20} color="#F53E8A" />
            <Text className="mt-1.5 text-sm font-semibold text-dark" numberOfLines={1}>
              {provider.city ?? '—'}
            </Text>
            <Text className="text-xs text-grayText">Ville</Text>
          </View>
        </View>

        {/* Biography */}
        {provider.biography ? (
          <View className="mx-5 mt-6">
            <Text className="text-[18px] font-medium tracking-[-0.3px] text-dark">
              À propos
            </Text>
            <Text className="mt-3 text-sm leading-5 text-grayText">
              {provider.biography}
            </Text>
          </View>
        ) : null}

        {/* Facilities */}
        {provider.facilities.length > 0 ? (
          <View className="mx-5 mt-6">
            <Text className="text-[18px] font-medium tracking-[-0.3px] text-dark">
              Lieux de consultation
            </Text>
            {provider.facilities.map((f) => (
              <View
                key={f.id}
                className="mt-3 flex-row items-center rounded-panel border border-hairline bg-white p-4"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="location" size={18} color="#F53E8A" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-dark">{f.name}</Text>
                  {f.city ? (
                    <Text className="mt-0.5 text-xs text-grayText">{f.city}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Services */}
        <View className="mx-5 mt-6">
          <Text className="text-[18px] font-medium tracking-[-0.3px] text-dark">
            Services & tarifs
          </Text>
          {services.length > 0 ? (
            <View className="mt-3 gap-3">
              {services.map((s) => (
                <View
                  key={s.id}
                  className="rounded-panel border border-hairline bg-white p-4 shadow-panel"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-dark">
                        {s.name}
                      </Text>
                      {s.description ? (
                        <Text className="mt-1 text-xs leading-4 text-grayText" numberOfLines={2}>
                          {s.description}
                        </Text>
                      ) : null}
                      <View className="mt-2 flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={13} color="#929292" />
                          <Text className="text-xs text-grayText">
                            {s.durationMinutes} min
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="medkit-outline" size={13} color="#929292" />
                          <Text className="text-xs text-grayText">
                            {SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-semibold text-primary">
                        {s.price}{' '}
                        <Text className="text-xs font-medium text-grayText">
                          {s.currency}
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    className="mt-3 rounded-lg bg-primary py-2.5"
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push(`/booking/${provider.id}?serviceId=${s.id}`)
                    }
                  >
                    <Text className="text-center text-sm font-medium text-white">
                      Réserver
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View className="mt-4 items-center rounded-panel border border-hairline bg-white p-6">
              <Ionicons name="information-circle-outline" size={32} color="#929292" />
              <Text className="mt-2 text-sm text-grayText">
                Aucun service disponible pour le moment
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
