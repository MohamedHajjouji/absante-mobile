import { useState, useEffect, useMemo, useCallback } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n/language-context';
import {
  getProviderDetail,
  getProviderServicesForBooking,
  getCalendarForService,
  getAvailableSlots,
  bookAppointment,
  bookGuestAppointment,
  getUserProfile,
  ProviderServiceItem,
  TimeSlot,
} from '@/lib/services/patient-service';

function formatDate(iso: string, tag: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Canonical site URL for the payment bridge (/pay/[oid]). Override per
// environment with EXPO_PUBLIC_SITE_URL; defaults to production.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.absante.ma';

function generateDates(tag: string): { date: string; label: string; dayNum: string; dayName: string }[] {
  const dates = [];
  const now = new Date();
  const dayFmt = new Intl.DateTimeFormat(tag, { weekday: 'short' });
  const monthFmt = new Intl.DateTimeFormat(tag, { month: 'short' });
  for (let i = 0; i < 21; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${dayFmt.format(d)} ${d.getDate()} ${monthFmt.format(d)}`,
      dayNum: String(d.getDate()),
      dayName: dayFmt.format(d).replace('.', ''),
    });
  }
  return dates;
}

export default function BookingScreen() {
  const rawParams = useLocalSearchParams<{
    providerId: string;
    serviceId?: string;
  }>();
  const rawProviderId = rawParams.providerId;
  const rawPreService = rawParams.serviceId;
  // Deep links can deliver params as arrays — normalize to single strings.
  const providerId = Array.isArray(rawProviderId) ? rawProviderId[0] : rawProviderId;
  const preServiceId = Array.isArray(rawPreService) ? rawPreService[0] : rawPreService;
  const router = useRouter();
  const { user } = useAuth();
  const { t, localeTag, lang } = useLanguage();
  const pluralS = (n: number) => (lang === 'ar' ? '' : n > 1 ? (lang === 'en' ? 's' : 'x') : '');

  const STEPS = [t('booking.steps.0'), t('booking.steps.1'), t('booking.steps.2'), t('booking.steps.3')];

  const SERVICE_TYPE_LABELS: Record<string, string> = {
    consultation: t('booking.type.consultation'),
    treatment: t('booking.type.treatment'),
    examination: t('booking.type.examination'),
    laboratory: t('booking.type.laboratory'),
    radiology: t('booking.type.radiology'),
    vaccination: t('booking.type.vaccination'),
    other: t('booking.type.other'),
  };

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
  // Guest contact (parity with web guest checkout — no login wall).
  const [guestFirst, setGuestFirst] = useState('');
  const [guestLast, setGuestLast] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [bookedId, setBookedId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const dates = useMemo(() => generateDates(localeTag), [localeTag]);

  const load = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setLoadError(false);
      const [detail, svcs, profile] = await Promise.all([
        getProviderDetail(providerId),
        getProviderServicesForBooking(providerId),
        user?.id ? getUserProfile(user.id) : Promise.resolve(null),
      ]);

      setProviderName(detail ? `Dr ${detail.firstName} ${detail.lastName}` : t('booking.genericDoctor'));
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
    } catch (e) {
      console.error('Failed to load booking data:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [providerId, preServiceId, user?.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedService || !providerId) return;
    let active = true;
    getCalendarForService(providerId, selectedService.id)
      .then((cid) => {
        if (active) setCalendarId(cid);
      })
      .catch((e) => console.error('Failed to load calendar:', e));
    return () => {
      active = false;
    };
  }, [selectedService, providerId]);

  useEffect(() => {
    if (!calendarId || !selectedDate || !selectedService) return;
    let active = true;
    setSlotsLoading(true);
    setSelectedSlot(null);
    getAvailableSlots(
      calendarId,
      selectedDate,
      selectedService.durationMinutes,
      selectedService.bufferMinutes,
      providerId
    )
      .then((s) => {
        if (!active) return;
        setSlots(s);
        setSlotsLoading(false);
      })
      .catch((e) => {
        console.error('Failed to load slots:', e);
        if (active) {
          setSlots([]);
          setSlotsLoading(false);
        }
      });
    return () => {
      active = false;
    };
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

  const validateGuest = () => {
    const errs: Record<string, string> = {};
    if (!guestFirst.trim()) errs.first = t('booking.errFirstRequired');
    if (!guestLast.trim()) errs.last = t('booking.errLastRequired');
    if (!guestEmail.trim()) errs.email = t('booking.errEmailRequired');
    else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(guestEmail.trim()))
      errs.email = t('booking.errEmailInvalid');
    if (guestPhone.trim().length < 8) errs.phone = t('booking.errPhoneInvalid');
    setGuestErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBook = async () => {
    if (!providerId || !selectedService || !calendarId || !selectedSlot) return;

    // Logged-in path (unchanged)
    if (user?.id) {
      setSubmitting(true);
      try {
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

        if (result.success) {
          setIsGuestBooking(false);
          setBookedId(result.appointmentId ?? null);
          setSuccess(true);
        } else {
          Alert.alert(t('booking.bookError'), result.error || t('booking.bookFail'));
        }
      } catch (e) {
        console.error('Booking failed:', e);
        Alert.alert(t('booking.bookError'), t('booking.bookFailNet'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Guest path — no login wall, same RPC contract as web.
    if (!validateGuest()) return;
    setSubmitting(true);
    try {
      const result = await bookGuestAppointment({
        providerId,
        serviceId: selectedService.id,
        calendarId,
        startsAt: selectedSlot.starts_at,
        endsAt: selectedSlot.ends_at,
        firstName: guestFirst,
        lastName: guestLast,
        email: guestEmail,
        phone: guestPhone,
        notes,
      });
      if (result.success) {
        setIsGuestBooking(true);
        setBookedId(result.appointmentId ?? null);
        setSuccess(true);
      } else {
        Alert.alert(t('booking.bookError'), result.error || t('booking.bookFail'));
      }
    } catch (e) {
      console.error('Guest booking failed:', e);
      Alert.alert(t('booking.bookError'), t('booking.bookFailNet'));
    } finally {
      setSubmitting(false);
    }
  };

  // Online payment (CMI Phase 2): after success, ask the server whether
  // THIS appointment requires it. Renders nothing when it doesn't.
  const [payState, setPayState] = useState<
    | { kind: 'idle' }
    | { kind: 'checking' }
    | { kind: 'ready'; oid: string; amount: number }
    | { kind: 'not-required' }
    | { kind: 'unavailable' }
    | { kind: 'failed' }
  >({ kind: 'idle' });
  const [payVerified, setPayVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!success || !bookedId) return;
    let cancelled = false;
    setPayState({ kind: 'checking' });
    (async () => {
      try {
        const res = await fetch(`${SITE_URL}/api/billing/cmi/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: bookedId,
            payer_email: user?.id ? (user as { email?: string }).email ?? '' : guestEmail,
          }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (data?.required && data?.oid) {
          setPayState({ kind: 'ready', oid: data.oid, amount: Number(data.amount) });
        } else if (data?.required && data?.unavailable) {
          setPayState({ kind: 'unavailable' });
        } else {
          setPayState({ kind: 'not-required' });
        }
      } catch (e) {
        console.error('Payment eligibility check failed:', e);
        if (!cancelled) setPayState({ kind: 'failed' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, bookedId]);

  const openPayPage = async () => {
    if (payState.kind !== 'ready') return;
    await WebBrowser.openBrowserAsync(`${SITE_URL}/pay/${payState.oid}`);
  };

  const verifyPayment = async () => {
    if (payState.kind !== 'ready' || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch(`${SITE_URL}/api/billing/cmi/receipt?oid=${payState.oid}`);
      const data = await res.json().catch(() => null);
      if (data?.ok && data?.status === 'approved') setPayVerified(true);
      else Alert.alert(t('booking.bookError'), t('booking.payNotDone'));
    } catch (e) {
      console.error('Payment verify failed:', e);
      Alert.alert(t('booking.bookError'), t('booking.bookFailNet'));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg">
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  if ((loadError || !providerId) && !success) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg px-8">
        <Ionicons name="cloud-offline-outline" size={48} color="#F53E8A" />
        <Text className="mt-4 text-base font-semibold text-dark">
          {t('booking.offlineTitle')}
        </Text>
        <Text className="mt-2 text-center text-sm text-grayText">
          {t('booking.offlineBody')}
        </Text>
        <TouchableOpacity onPress={load} className="mt-6 rounded-lg bg-primary px-6 py-3">
          <Text className="text-sm font-medium text-white">{t('booking.retry')}</Text>
        </TouchableOpacity>
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
          {t('booking.successTitle')}
        </Text>
        <Text className="mt-3 text-center text-sm leading-5 text-grayText">
          {isGuestBooking
            ? t('booking.successGuestBody', { name: providerName, email: guestEmail })
            : t('booking.successBody', { name: providerName })}
        </Text>
        {/* Reassurance: what happens next (same promise as web) */}
        <View className="mt-5 w-full rounded-panel border border-hairline bg-white p-4">
          <Text className="text-center text-xs leading-4 text-grayText">
            {t('booking.successNotice')}
          </Text>
        </View>
        {/* Online payment when this booking requires it (Premium+ téléconsultation) */}
        {payVerified ? (
          <View className="mt-4 w-full items-center rounded-panel bg-success-50 p-4">
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text className="mt-2 text-center text-sm font-semibold text-dark">
              {t('booking.payDone')}
            </Text>
          </View>
        ) : payState.kind === 'ready' ? (
          <View className="mt-4 w-full rounded-panel border border-hairline bg-white p-5 shadow-panel">
            <Text className="text-center text-sm font-semibold text-dark">
              {t('booking.payTitle')}
            </Text>
            <Text className="mt-1 text-center text-2xl font-semibold text-dark">
              {payState.amount.toFixed(2)}{' '}
              <Text className="text-xs font-medium text-grayText">MAD</Text>
            </Text>
            <Text className="mt-1 text-center text-xs leading-4 text-grayText">
              {t('booking.payBody')}
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-lg bg-primary py-4"
              activeOpacity={0.8}
              onPress={openPayPage}
            >
              <Text className="text-center text-base font-medium text-white">
                {t('booking.payBtn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-2 py-2"
              activeOpacity={0.7}
              onPress={verifyPayment}
              disabled={verifying}
            >
              <Text className="text-center text-sm font-medium text-primary">
                {verifying ? t('booking.payChecking') : t('booking.payCheck')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : payState.kind === 'unavailable' ? (
          <View className="mt-4 w-full rounded-panel bg-amber-50 p-4">
            <Text className="text-center text-xs leading-4 text-grayText">
              {t('booking.paySoon')}
            </Text>
          </View>
        ) : null}
        <View className="mt-6 w-full gap-3">
          {isGuestBooking ? (
            <>
              <TouchableOpacity
                className="rounded-lg bg-primary py-4"
                activeOpacity={0.8}
                onPress={() => router.replace('/(auth)/register?role=client')}
              >
                <Text className="text-center text-base font-medium text-white">
                  {t('booking.createAccount')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg border border-hairline bg-white py-4"
                activeOpacity={0.8}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text className="text-center text-base font-medium text-dark">
                  {t('booking.backHome')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                className="rounded-lg bg-primary py-4"
                activeOpacity={0.8}
                onPress={() => router.replace('/(tabs)/rdv')}
              >
                <Text className="text-center text-base font-medium text-white">
                  {t('booking.viewRdv')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-lg border border-hairline bg-white py-4"
                activeOpacity={0.8}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text className="text-center text-base font-medium text-dark">
                  {t('booking.backHome')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    // bottom edge lifts the sticky CTA above the system nav bar / home indicator
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top', 'bottom']}>
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
          <Text className="text-base font-semibold text-dark">{t('booking.title')}</Text>
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
              {t('booking.serviceTitle')}
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              {t('booking.serviceBody')}
            </Text>
            {!user?.id && (
              <View className="mt-3 flex-row items-center gap-2 rounded-lg bg-success-50 px-3 py-2.5">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="flex-1 text-xs leading-4 text-grayText">
                  {t('booking.noAccountNeeded')}
                </Text>
              </View>
            )}
            {services.length === 0 ? (
              <View className="mt-6 items-center rounded-panel border border-hairline bg-white p-6">
                <Ionicons name="information-circle-outline" size={32} color="#929292" />
                <Text className="mt-2 text-center text-sm text-grayText">
                  {t('booking.noServices')}
                </Text>
                <TouchableOpacity
                  className="mt-4 rounded-lg bg-primary px-6 py-3"
                  activeOpacity={0.8}
                  onPress={() => router.back()}
                >
                  <Text className="text-center text-sm font-medium text-white">
                    {t('booking.backToDoctor')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
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
                              {s.durationMinutes} {t('booking.min')}
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
            )}
          </View>
        )}

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <View className="px-5 pt-5">
            <Text className="text-lg font-semibold text-dark">
              {t('booking.dateTitle')}
            </Text>
            {/* Price transparency upfront — reduces abandonment at payment anxiety */}
            <View className="mt-2 flex-row items-center justify-between rounded-lg bg-white px-3 py-2.5" style={{ borderWidth: 1, borderColor: '#F2F2F2' }}>
              <Text className="flex-1 text-xs font-medium text-dark" numberOfLines={1}>
                {selectedService?.name}
              </Text>
              <Text className="text-xs text-grayText">
                {selectedService?.durationMinutes} {t('booking.min')} ·{' '}
              </Text>
              <Text className="text-sm font-semibold text-primary">
                {selectedService?.price} {selectedService?.currency}
              </Text>
            </View>
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
                      {d.label.split(' ').slice(-1)[0]}
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
                        ? t('booking.slotsPreview', {
                            n: slots.length,
                            plural: pluralS(slots.length),
                            plural2: pluralS(slots.length),
                          })
                        : t('booking.noSlots')}
                    </Text>
                    <Text className="mt-1 text-xs text-grayText">
                      {formatDate(selectedDate + 'T12:00:00Z', localeTag)}
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
              {t('booking.slotTitle')}
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              {selectedDate ? formatDate(selectedDate + 'T12:00:00Z', localeTag) : ''}
            </Text>
            <View className="mt-2 flex-row items-center justify-between rounded-lg bg-white px-3 py-2.5" style={{ borderWidth: 1, borderColor: '#F2F2F2' }}>
              <Text className="flex-1 text-xs font-medium text-dark" numberOfLines={1}>
                {selectedService?.name}
              </Text>
              <Text className="text-sm font-semibold text-primary">
                {selectedService?.price} {selectedService?.currency}
              </Text>
            </View>

            {slotsLoading ? (
              <View className="mt-10 items-center">
                <ActivityIndicator size="large" color="#F53E8A" />
              </View>
            ) : slots.length === 0 ? (
              <View className="mt-10 items-center">
                <Ionicons name="time-outline" size={48} color="#929292" />
                <Text className="mt-4 text-sm text-grayText">
                  {t('booking.slotEmpty')}
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
              {t('booking.confirmTitle')}
            </Text>
            <Text className="mt-1 text-sm text-grayText">
              {t('booking.confirmBody')}
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
                    {selectedService?.durationMinutes} {t('booking.min')} ·{' '}
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
                      ? formatDate(selectedDate + 'T12:00:00Z', localeTag)
                      : ''}
                  </Text>
                  <Text className="text-xs text-grayText">
                    {t('booking.at', { time: selectedSlot?.time ?? '' })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Guest contact — shown instead of the old login wall */}
            {!user?.id && (
              <View className="mt-5 rounded-panel border border-hairline bg-white p-4">
                <Text className="text-sm font-semibold text-dark">
                  {t('booking.contactTitle')}
                </Text>
                <Text className="mt-1 text-xs leading-4 text-grayText">
                  {t('booking.contactGuestSub')}
                </Text>
                <View className="mt-3 flex-row gap-2">
                  <View className="flex-1">
                    <TextInput
                      className="rounded-lg bg-softCloud/60 px-3 py-3 text-sm text-dark"
                      placeholder={t('booking.firstName')}
                      placeholderTextColor="#929292"
                      value={guestFirst}
                      onChangeText={setGuestFirst}
                      autoCapitalize="words"
                    />
                    {!!guestErrors.first && (
                      <Text className="mt-1 text-xs text-red-500">{guestErrors.first}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <TextInput
                      className="rounded-lg bg-softCloud/60 px-3 py-3 text-sm text-dark"
                      placeholder={t('booking.lastName')}
                      placeholderTextColor="#929292"
                      value={guestLast}
                      onChangeText={setGuestLast}
                      autoCapitalize="words"
                    />
                    {!!guestErrors.last && (
                      <Text className="mt-1 text-xs text-red-500">{guestErrors.last}</Text>
                    )}
                  </View>
                </View>
                <TextInput
                  className="mt-2 rounded-lg bg-softCloud/60 px-3 py-3 text-sm text-dark"
                  placeholder={t('booking.email')}
                  placeholderTextColor="#929292"
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {!!guestErrors.email && (
                  <Text className="mt-1 text-xs text-red-500">{guestErrors.email}</Text>
                )}
                <TextInput
                  className="mt-2 rounded-lg bg-softCloud/60 px-3 py-3 text-sm text-dark"
                  placeholder={t('booking.phonePh')}
                  placeholderTextColor="#929292"
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  keyboardType="phone-pad"
                />
                {!!guestErrors.phone && (
                  <Text className="mt-1 text-xs text-red-500">{guestErrors.phone}</Text>
                )}
                <Text className="mt-2 text-[11px] leading-4 text-grayText">
                  {t('booking.emailHint')}
                </Text>
              </View>
            )}

            {/* Notes */}
            <View className="mt-5">
              <Text className="mb-1.5 text-sm font-medium text-dark">
                {t('booking.notes')}
              </Text>
              <View
                className="rounded-lg bg-white px-4"
                style={{ borderWidth: 1, borderColor: '#DDDDDD' }}
              >
                <TextInput
                  className="min-h-[80px] py-3 text-sm text-dark"
                  placeholder={t('booking.notesPh')}
                  placeholderTextColor="#929292"
                  multiline
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>

            {/* Reassurance — same promise as web, reduces no-show anxiety */}
            <View className="mt-4 rounded-panel bg-secondary-tone-50 p-4">
              <Text className="text-xs leading-4 text-secondary-tone">
                {t('booking.cancelPolicy')}
              </Text>
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
              {t('booking.continue')}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              className={`rounded-lg py-4 ${submitting ? 'bg-softCloud' : 'bg-primary'}`}
              activeOpacity={submitting ? 1 : 0.8}
              onPress={submitting ? undefined : handleBook}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#F53E8A" />
              ) : (
                <Text className="text-center text-base font-medium text-white">
                  {t('booking.confirmBtn')}
                </Text>
              )}
            </TouchableOpacity>
            {!user?.id && (
              <TouchableOpacity
                className="mt-2 py-2"
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text className="text-center text-sm font-medium text-primary">
                  {t('booking.haveAccount')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
