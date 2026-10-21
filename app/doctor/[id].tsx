import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getProviderDetail,
  getProviderServicesForBooking,
  ProviderDetail,
  ProviderServiceItem,
} from '@/lib/services/patient-service';
import { useLanguage } from '@/lib/i18n/language-context';
import { DoctorMap } from '@/components/map/DoctorMap';
import { MapModal } from '@/components/map/MapModal';

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

export default function DoctorDetailScreen() {
  const rawParams = useLocalSearchParams<{ id: string }>();
  const rawId = rawParams.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { t } = useLanguage();

  const SERVICE_TYPE_LABELS: Record<string, string> = {
    consultation: t('doctor.type.consultation'),
    treatment: t('doctor.type.treatment'),
    examination: t('doctor.type.examination'),
    laboratory: t('doctor.type.laboratory'),
    radiology: t('doctor.type.radiology'),
    vaccination: t('doctor.type.vaccination'),
    other: t('doctor.type.other'),
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setLoadError(false);
      const [detail, svcs] = await Promise.all([
        getProviderDetail(id),
        getProviderServicesForBooking(id),
      ]);
      setProvider(detail);
      setServices(svcs);
    } catch (e) {
      console.error('Failed to load provider:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  if (loadError && !provider) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg px-8">
        <Ionicons name="cloud-offline-outline" size={48} color="#F53E8A" />
        <Text className="mt-4 text-base font-semibold text-dark">
          {t('doctor.offlineTitle')}
        </Text>
        <Text className="mt-2 text-center text-sm text-grayText">
          {t('doctor.offlineBody')}
        </Text>
        <TouchableOpacity
          onPress={load}
          className="mt-6 rounded-lg bg-primary px-6 py-3"
        >
          <Text className="text-sm font-medium text-white">{t('doctor.retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <Ionicons name="alert-circle-outline" size={48} color="#929292" />
        <Text className="mt-4 text-base font-medium text-grayText">
          {t('doctor.notFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 rounded-lg bg-primary px-6 py-3"
        >
          <Text className="text-sm font-medium text-white">{t('doctor.back')}</Text>
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
          <Text className="text-base font-semibold text-dark">{t('doctor.title')}</Text>
          <View className="h-11 w-11" />
        </View>

        {/* Provider Hero */}
        <View className="mt-6 items-center px-5">
          {provider.avatarUrl ? (
            <Image
              source={{ uri: provider.avatarUrl }}
              className="h-24 w-24 rounded-full"
              accessibilityLabel={t('doctor.photoAlt', { name: `${provider.firstName} ${provider.lastName}` })}
            />
          ) : (
            <View
              className="h-24 w-24 items-center justify-center rounded-full"
              style={{ backgroundColor: meta.bg }}
            >
              {`${provider.firstName?.[0] ?? ''}${provider.lastName?.[0] ?? ''}`.toUpperCase() ? (
                <Text className="text-3xl font-bold" style={{ color: meta.color }}>
                  {`${provider.firstName?.[0] ?? ''}${provider.lastName?.[0] ?? ''}`.toUpperCase()}
                </Text>
              ) : (
                <Ionicons name={meta.icon} size={44} color={meta.color} />
              )}
            </View>
          )}

          <Text className="mt-4 text-2xl font-semibold tracking-[-0.3px] text-dark">
            Dr {provider.firstName} {provider.lastName}
          </Text>
          <Text className="mt-1 text-sm font-medium text-grayText">
            {provider.specialty}
          </Text>

          {/* Verified badge */}
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons
              name={provider.isRegistered ? 'shield-checkmark' : 'information-circle-outline'}
              size={14}
              color={provider.isRegistered ? '#0D61B6' : '#B7791F'}
            />
            <Text className="text-xs font-medium text-secondary-tone">
              {provider.isRegistered ? t('doctor.verified') : t('doctor.unclaimed')}
            </Text>
          </View>
        </View>

        {/* Claim banner for unclaimed directory profiles */}
        {!provider.isRegistered && (
          <View className="mx-5 mt-6 rounded-panel border border-amber-200 bg-amber-50 p-4">
            <View className="flex-row items-start gap-3">
              <Ionicons name="checkmark-circle-outline" size={20} color="#B7791F" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">
                  {t('doctor.claimTitle', { name: `${provider.firstName} ${provider.lastName}` })}
                </Text>
                <Text className="mt-1 text-xs leading-4 text-grayText">
                  {t('doctor.claimBody')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="mt-3 rounded-lg bg-dark py-3"
              activeOpacity={0.8}
              onPress={() => router.push('/(onboarding)/professional')}
              accessibilityRole="button"
              accessibilityLabel={t('doctor.claimA11y')}
            >
              <Text className="text-center text-sm font-semibold text-white">
                {t('doctor.claimCta')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Row */}
        <View className="mx-5 mt-6 flex-row gap-3">
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text className="mt-1.5 text-lg font-semibold text-dark">
              {(typeof provider.rating === 'number' && Number.isFinite(provider.rating)
                ? provider.rating
                : 0
              ).toFixed(1)}
            </Text>
            <Text className="text-xs text-grayText">
              {t('doctor.reviews', { n: provider.reviewCount })}
            </Text>
          </View>
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="time-outline" size={20} color="#0D61B6" />
            <Text className="mt-1.5 text-lg font-semibold text-dark">
              {provider.yearsOfExperience ?? '—'}
            </Text>
            <Text className="text-xs text-grayText">{t('doctor.yearsExp')}</Text>
          </View>
          <View className="flex-1 items-center rounded-panel border border-hairline bg-white p-4 shadow-panel">
            <Ionicons name="location-outline" size={20} color="#F53E8A" />
            <Text className="mt-1.5 text-sm font-semibold text-dark" numberOfLines={1}>
              {provider.city ?? '—'}
            </Text>
            <Text className="text-xs text-grayText">{t('doctor.city')}</Text>
          </View>
        </View>

        {/* Biography */}
        {provider.biography ? (
          <View className="mx-5 mt-6">
            <Text className="text-[18px] font-medium tracking-[-0.3px] text-dark">
              {t('doctor.about')}
            </Text>
            <Text className="mt-3 text-sm leading-5 text-grayText">
              {provider.biography}
            </Text>
          </View>
        ) : null}

        {/* Facilities */}
        {(provider.facilities ?? []).length > 0 ? (
          <View className="mx-5 mt-6">
            <Text className="text-[18px] font-medium tracking-[-0.3px] text-dark">
              {t('doctor.places')}
            </Text>
            {(provider.facilities ?? []).some((f) => f.lat != null && f.lng != null) ? (
              <View className="mt-3 overflow-hidden rounded-panel border border-hairline">
                {/* Static preview — gestures off so the page scroll still works; tap opens the full-screen map */}
                <DoctorMap
                  key={(provider.facilities ?? [])
                    .filter((f) => f.lat != null && f.lng != null)
                    .map((f) => f.id)
                    .join(',')}
                  pins={(provider.facilities ?? [])
                    .filter((f) => f.lat != null && f.lng != null)
                    .map((f) => ({
                      lat: f.lat as number,
                      lng: f.lng as number,
                      title: f.name,
                      description: f.city || undefined,
                    }))}
                  height={220}
                  preview
                  onOpen={() => setMapOpen(true)}
                />
              </View>
            ) : null}
            {((provider.facilities ?? [])).map((f) => (
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
            {t('doctor.services')}
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
                            {s.durationMinutes} {t('doctor.min')}
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
                  {provider.isRegistered ? (
                    <TouchableOpacity
                      className="mt-3 rounded-lg bg-primary py-2.5"
                      activeOpacity={0.8}
                      onPress={() => {
                        router.push(`/booking/${provider.id}?serviceId=${s.id}`);
                      }}
                    >
                      <Text className="text-center text-sm font-medium text-white">
                        {t('doctor.book')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5" style={{ borderWidth: 1, borderColor: '#FDE68A' }}>
                      <Text className="text-center text-xs leading-4 text-grayText">
                        {t('doctor.bookSoonBody')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="mt-4 items-center rounded-panel border border-hairline bg-white p-6">
              <Ionicons name="information-circle-outline" size={32} color="#929292" />
              <Text className="mt-2 text-center text-sm text-grayText">
                {!provider.isRegistered
                  ? t('doctor.bookSoonBody')
                  : t('doctor.noServices')}
              </Text>
              {!provider.isRegistered ? (
                <TouchableOpacity
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Text className="text-center text-sm font-medium text-white">
                    {t('doctor.findOther')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full-screen interactive map (opened from the facilities preview) */}
      <MapModal visible={mapOpen} title={t('doctor.places')} onClose={() => setMapOpen(false)}>
        <DoctorMap
          key={`modal-${(provider?.facilities ?? [])
            .filter((f) => f.lat != null && f.lng != null)
            .map((f) => f.id)
            .join(',')}`}
          pins={(provider?.facilities ?? [])
            .filter((f) => f.lat != null && f.lng != null)
            .map((f) => ({
              lat: f.lat as number,
              lng: f.lng as number,
              title: f.name,
              description: f.city || undefined,
            }))}
          full
        />
      </MapModal>
    </SafeAreaView>
  );
}
