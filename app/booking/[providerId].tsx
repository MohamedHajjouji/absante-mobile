import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  getProviderDetail,
  getProviderServicesForBooking,
  getCalendarForService,
  getAvailableSlots,
  bookAppointment,
  getUserProfile,
  ProviderServiceItem,
  TimeSlot,
} from '@/lib/services/patient-service';

const STEPS = ['Service', 'Date', 'Horaire', 'Confirmation'];

const SERVICE_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  treatment: 'Traitement',
  examination: 'Examen',
  laboratory: 'Laboratoire',
  radiology: 'Radiologie',
  vaccination: 'Vaccination',
  other: 'Autre',
};

const MONTHS = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateDates(): { date: string; label: string; dayNum: string; dayName: string }[] {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 21; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      dayNum: String(d.getDate()),
      dayName: DAY_NAMES[d.getDay()],
    });
  }
  return dates;
}

export default function BookingScreen() {
  const { providerId, serviceId: preServiceId } = useLocalSearchParams<{
    providerId: string;
    serviceId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(preServiceId ? 1 : 0);
  const [providerName, setProviderName] = useState('');
  const [providerSpecialty, setProviderSpecialty] = useState('');
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ProviderServiceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [calendarId, setCalendarId] = useState<string | null>(null);
  const [userName, setUserName] = useState({ first: '', last: '', phone: '' });
  const [success, setSuccess] = useState(false);

  const dates = useMemo(() => generateDates(), []);

  useEffect(() => {
    if (!providerId) return;
    (async () => {
      const [detail, svcs, profile] = await Promise.all([
        getProviderDetail(providerId),
        getProviderServicesForBooking(providerId),
        user?.id ? getUserProfile(user.id) : Promise.resolve(null),
      ]);

      setProviderName(detail ? `Dr ${detail.firstName} ${detail.lastName}` : 'Médecin');
      setProviderSpecialty(detail?.specialty ?? '');
      setServices(svcs);

      if (profile) {
        setUserName({
          first: profile.firstName,
          last: profile.lastName,
          phone: profile.phone ?? '',
        });
      }

      if (preServiceId) {
        const pre = svcs.find((s) => s.id === preServiceId);
        if (pre) setSelectedService(pre);
      }

      setLoading(false);
    })();
  }, [providerId, preServiceId, user?.id]);

  useEffect(() => {
    if (!selectedService || !providerId) return;
    getCalendarForService(providerId, selectedService.id).then((cid) => {
      setCalendarId(cid);
    });
  }, [selectedService, providerId]);

  useEffect(() => {
    if (!calendarId || !selectedDate || !selectedService) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    getAvailableSlots(
      calendarId,
      selectedDate,
      selectedService.durationMinutes,
      selectedService.bufferMinutes
    ).then((s) => {
      setSlots(s);
      setSlotsLoading(false);
    });
  }, [calendarId, selectedDate, selectedService]);

  const canGoNext = () => {
    if (step === 0) return !!selectedService;
    if (step === 1) return !!selectedDate;
    if (step === 2) return !!selectedSlot;
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const handleBook = async () => {
    if (!user?.id || !providerId || !selectedService || !calendarId || !selectedSlot) return;

    setSubmitting(true);
    const result = await bookAppointment({
      userId: user.id,
      providerId,
      serviceId: selectedService.id,
      calendarId,
      startsAt: selectedSlot.starts_at,
      endsAt: selectedSlot.ends_at,
      notes,
      firstName: userName.first,
      lastName: userName.last,
      phone: userName.phone,
    });
    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de prendre le rendez-vous.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg px-8">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-success-50">
          <Ionicons name="checkmark-circle" size={56} color="#10B981" />
        </View>
        <Text className="mt-6 text-center text-2xl font-semibold text-dark">
          Rendez-vous confirmé !
        </Text>
        <Text className="mt-3 text-center text-sm leading-5 text-grayText">
          Votre rendez-vous avec {providerName} a été enregistré. Vous recevrez
          une confirmation prochainement.
        </Text>
        <View className="mt-8 w-full gap-3">
          <TouchableOpacity
            className="rounded-lg bg-primary py-4"
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)/rdv')}
          >
            <Text className="text-center text-base font-medium text-white">
              Voir mes rendez-vous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-lg border border-hairline bg-white py-4"
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text className="text-center text-base font-medium text-dark">
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={handleBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-white"
          style={{ borderWidth: 1, borderColor: '#F2F2F2' }}
        >
          <Ionicons name="chevron-back" size={22} color="#3D4B64" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-semibold text-dark">Réservation</Text>
          <Text className="text-xs text-grayText">{providerName}</Text>
        </View>
        <View className="h-11 w-11" />
      </View>

      {/* Step indicator */}
      <View className="flex-row items-center justify-center gap-2 px-8 pt-3 pb-4">
        {STEPS.map((label, idx) => {
          const active = idx === step;
          const done = idx < step;
          return (
            <View key={label} className="flex-1 items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  done
                    ? 'bg-primary'
                    : active
                    ? 'bg-primary'
                    : 'bg-softCloud'
                }`}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text
                    className={`text-xs font-bold ${
                      active ? 'text-white' : 'text-grayText'
                    }`}
                  >
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`mt-1 text-[10px] font-medium ${
                  active ? 'text-primary' : 'text-grayText'
                }`}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="h-px bg-hairline mx-5" />

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0: Service Selection */}
        {step === 0 && (
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-dark">
              Choisissez un service
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              Sélectionnez le type de consultation souhaité
            </Text>
            <View className="mt-4 gap-3">
              {services.map((s) => {
                const selected = selectedService?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    className={`rounded-panel border bg-white p-4 ${
                      selected
                        ? 'border-primary shadow-panel'
                        : 'border-hairline'
                    }`}
                    activeOpacity={0.7}
                    onPress={() => setSelectedService(s)}
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
                          <Text className="text-xs text-grayText">
                            {SERVICE_TYPE_LABELS[s.serviceType] ?? s.serviceType}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-semibold text-primary">
                          {s.price}{' '}
                          <Text className="text-xs font-medium text-grayText">
                            {s.currency}
                          </Text>
                        </Text>
                        <View
                          className={`mt-2 h-6 w-6 items-center justify-center rounded-full ${
                            selected ? 'bg-primary' : 'border border-hairline bg-white'
                          }`}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-dark">
              Choisissez une date
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              {selectedService?.name} · {selectedService?.durationMinutes} min
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 16 }}
            >
              {dates.map((d) => {
                const selected = selectedDate === d.date;
                return (
                  <TouchableOpacity
                    key={d.date}
                    className={`items-center rounded-full px-4 py-3 ${
                      selected ? 'bg-primary' : 'bg-white'
                    }`}
                    style={{
                      borderWidth: selected ? 0 : 1,
                      borderColor: '#F2F2F2',
                      minWidth: 64,
                    }}
                    activeOpacity={0.7}
                    onPress={() => setSelectedDate(d.date)}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        selected ? 'text-white/80' : 'text-grayText'
                      }`}
                    >
                      {d.dayName}
                    </Text>
                    <Text
                      className={`mt-0.5 text-lg font-semibold ${
                        selected ? 'text-white' : 'text-dark'
                      }`}
                    >
                      {d.dayNum}
                    </Text>
                    <Text
                      className={`text-[10px] font-medium ${
                        selected ? 'text-white/80' : 'text-grayText'
                      }`}
                    >
                      {MONTHS[parseInt(d.date.split('-')[1], 10) - 1]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Preview: show slots count */}
            {selectedDate && calendarId && (
              <View className="mt-6 items-center rounded-panel border border-hairline bg-white p-5">
                {slotsLoading ? (
                  <ActivityIndicator size="small" color="#F53E8A" />
                ) : (
                  <>
                    <Ionicons
                      name={slots.length > 0 ? 'calendar-outline' : 'calendar-clear-outline'}
                      size={28}
                      color={slots.length > 0 ? '#0D61B6' : '#929292'}
                    />
                    <Text className="mt-2 text-sm font-medium text-dark">
                      {slots.length > 0
                        ? `${slots.length} créneau${slots.length > 1 ? 'x' : ''} disponible${slots.length > 1 ? 's' : ''}`
                        : 'Aucun créneau disponible'}
                    </Text>
                    <Text className="mt-1 text-xs text-grayText">
                      {formatDate(selectedDate + 'T12:00:00Z')}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Time Slot Selection */}
        {step === 2 && (
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-dark">
              Choisissez un créneau
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              {selectedDate ? formatDate(selectedDate + 'T12:00:00Z') : ''}
            </Text>

            {slotsLoading ? (
              <View className="mt-10 items-center">
                <ActivityIndicator size="large" color="#F53E8A" />
              </View>
            ) : slots.length === 0 ? (
              <View className="mt-10 items-center">
                <Ionicons name="time-outline" size={48} color="#929292" />
                <Text className="mt-4 text-sm text-grayText">
                  Aucun créneau disponible pour cette date
                </Text>
              </View>
            ) : (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {slots.map((slot) => {
                  const selected =
                    selectedSlot?.starts_at === slot.starts_at;
                  return (
                    <TouchableOpacity
                      key={slot.starts_at}
                      className={`rounded-full px-5 py-3 ${
                        selected ? 'bg-primary' : 'bg-white'
                      }`}
                      style={{
                        borderWidth: selected ? 0 : 1,
                        borderColor: '#F2F2F2',
                        minWidth: 80,
                      }}
                      activeOpacity={0.7}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        className={`text-center text-sm font-semibold ${
                          selected ? 'text-white' : 'text-dark'
                        }`}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-dark">
              Confirmez votre rendez-vous
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              Vérifiez les détails avant de confirmer
            </Text>

            {/* Summary card */}
            <View className="mt-4 rounded-panel border border-hairline bg-white p-5 shadow-panel">
              {/* Provider */}
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="person" size={22} color="#F53E8A" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-dark">
                    {providerName}
                  </Text>
                  <Text className="text-xs text-grayText">
                    {providerSpecialty}
                  </Text>
                </View>
              </View>

              <View className="mt-4 h-px bg-hairline" />

              {/* Service */}
              <View className="mt-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary-tone-50">
                  <Ionicons name="medkit" size={18} color="#0D61B6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-dark">
                    {selectedService?.name}
                  </Text>
                  <Text className="text-xs text-grayText">
                    {selectedService?.durationMinutes} min ·{' '}
                    {SERVICE_TYPE_LABELS[selectedService?.serviceType ?? ''] ??
                      selectedService?.serviceType}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-primary">
                  {selectedService?.price} {selectedService?.currency}
                </Text>
              </View>

              <View className="mt-4 h-px bg-hairline" />

              {/* Date & Time */}
              <View className="mt-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-success-50">
                  <Ionicons name="calendar" size={18} color="#10B981" />
                </View>
                <View>
                  <Text className="text-sm font-semibold text-dark">
                    {selectedDate
                      ? formatDate(selectedDate + 'T12:00:00Z')
                      : ''}
                  </Text>
                  <Text className="text-xs text-grayText">
                    à {selectedSlot?.time}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View className="mt-5">
              <Text className="mb-1.5 text-sm font-medium text-dark">
                Notes (optionnel)
              </Text>
              <View
                className="rounded-lg bg-white px-4"
                style={{ borderWidth: 1, borderColor: '#DDDDDD' }}
              >
                <TextInput
                  className="min-h-[80px] py-3 text-sm text-dark"
                  placeholder="Motif de la consultation, symptômes..."
                  placeholderTextColor="#929292"
                  multiline
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-5 pb-8 pt-4"
        style={{
          borderTopWidth: 1,
          borderTopColor: '#F2F2F2',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {step < 3 ? (
          <TouchableOpacity
            className={`rounded-lg py-4 ${
              canGoNext() ? 'bg-primary' : 'bg-softCloud'
            }`}
            activeOpacity={canGoNext() ? 0.8 : 1}
            onPress={canGoNext() ? handleNext : undefined}
          >
            <Text
              className={`text-center text-base font-medium ${
                canGoNext() ? 'text-white' : 'text-grayText'
              }`}
            >
              Continuer
            </Text>
          </TouchableOpacity>
        ) : !user?.id ? (
          <TouchableOpacity
            className="rounded-lg bg-primary py-4"
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text className="text-center text-base font-medium text-white">
              Se connecter pour confirmer
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`rounded-lg py-4 ${submitting ? 'bg-softCloud' : 'bg-primary'}`}
            activeOpacity={submitting ? 1 : 0.8}
            onPress={submitting ? undefined : handleBook}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#F53E8A" />
            ) : (
              <Text className="text-center text-base font-medium text-white">
                Confirmer le rendez-vous
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
