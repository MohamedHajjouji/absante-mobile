import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  getPatientByProfileId,
  getMyAppointments,
  cancelAppointment,
  getReviewForAppointment,
  submitReview,
  PatientAppointment,
  AppointmentReview,
} from '@/lib/services/patient-service';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDayNumber(iso: string) {
  return new Date(iso).getDate().toString();
}

function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
}

/** Star rating + comment for a completed appointment. Shown in the detail modal. */
function ReviewSection({
  appointmentId,
  providerId,
  patientId,
}: {
  appointmentId: string;
  providerId: string;
  patientId: string;
}) {
  const [existing, setExisting] = useState<AppointmentReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const review = await getReviewForAppointment(appointmentId);
        if (!active) return;
        setExisting(review);
        if (review) {
          setRating(review.rating);
          setComment(review.comment ?? '');
        }
      } catch (e) {
        console.error('Failed to load review:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <View className="mt-5 items-center py-3">
        <ActivityIndicator size="small" color="#F53E8A" />
      </View>
    );
  }

  if (existing) {
    return (
      <View className="mt-5 rounded-panel border border-hairline bg-softCloud/40 p-4">
        <View className="flex-row items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= existing.rating ? 'star' : 'star-outline'}
              size={18}
              color="#F59E0B"
            />
          ))}
          <Text className="ml-1 text-xs font-medium text-grayText">Votre avis</Text>
        </View>
        {!!existing.comment && (
          <Text className="mt-2 text-sm text-dark">{existing.comment}</Text>
        )}
      </View>
    );
  }

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const result = await submitReview({
        appointmentId,
        providerId,
        patientId,
        rating,
        comment,
      });
      if (result.success) {
        setExisting({ id: 'new', rating, comment: comment.trim() || null });
      } else {
        Alert.alert('Erreur', result.error || "Impossible d'envoyer votre avis.");
      }
    } catch (e) {
      console.error('Failed to submit review:', e);
      Alert.alert('Erreur', "Impossible d'envoyer votre avis. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mt-5 rounded-panel border border-hairline bg-white p-4 shadow-panel">
      <Text className="text-sm font-semibold text-dark">Noter cette consultation</Text>
      <View className="mt-3 flex-row items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
            <Ionicons
              name={s <= rating ? 'star' : 'star-outline'}
              size={30}
              color="#F59E0B"
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Partagez votre expérience (optionnel)..."
        placeholderTextColor="#929292"
        multiline
        numberOfLines={3}
        className="mt-3 rounded-lg border border-hairline px-3 py-2.5 text-sm text-dark"
        style={{ textAlignVertical: 'top' }}
      />
      <TouchableOpacity
        className="mt-3 rounded-lg bg-primary py-3"
        activeOpacity={0.8}
        onPress={handleSubmit}
        disabled={saving}
      >
        <Text className="text-center text-sm font-medium text-white">
          {saving ? 'Envoi...' : 'Envoyer mon avis'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppointmentsScreen() {
  const { user, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PatientAppointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAppointments = useCallback(async () => {
    // Any throw (offline, DNS, backend unreachable) must still clear the
    // spinner — otherwise the tab freezes on a loader that looks like a crash.
    try {
      setLoadError(false);
      if (!user?.id) return;
      const patient = await getPatientByProfileId(user.id);
      if (!patient) return;
      setPatientId(patient.id);
      setAppointments(await getMyAppointments(patient.id));
    } catch (e) {
      console.error('Failed to load appointments:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadAppointments(); }, [loadAppointments]);

  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.startsAt >= now && a.status !== 'cancelled' && a.status !== 'completed');
  const past = appointments.filter((a) => a.startsAt < now || a.status === 'cancelled' || a.status === 'completed');
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const handleCancel = async (appt: PatientAppointment) => {
    if (!patientId) return;
    Alert.alert('Annuler le rendez-vous', `Voulez-vous vraiment annuler avec ${appt.providerName} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const result = await cancelAppointment(appt.id, patientId);
            if (result.success) {
              setSelected(null);
              setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
            } else {
              Alert.alert('Erreur', result.error || "Impossible d'annuler.");
            }
          } catch (e) {
            console.error('Failed to cancel appointment:', e);
            Alert.alert('Erreur', "Impossible d'annuler. Vérifiez votre connexion.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  // Personal data — guests are sent to login (placed after hooks).
  if (isLoaded && !user?.id) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  if (loadError && appointments.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg px-8" edges={['top']}>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
          <Ionicons name="cloud-offline-outline" size={36} color="#F53E8A" />
        </View>
        <Text className="mt-6 text-lg font-semibold text-dark">Connexion impossible</Text>
        <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
          Vos rendez-vous n'ont pas pu être chargés. Vérifiez votre connexion puis réessayez.
        </Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); loadAppointments(); }}
          className="mt-6 rounded-full bg-primary px-8 py-3"
          activeOpacity={0.85}
        >
          <Text className="text-sm font-semibold text-white">Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(450)} className="px-5 pt-4">
          <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Rendez-vous</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">Gérez vos rendez-vous médicaux</Text>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(60).duration(450)} className="mx-5 mt-5 flex-row rounded-full bg-softCloud p-1">
          {(['upcoming', 'past'] as const).map((tab) => {
            const active = activeTab === tab;
            const count = tab === 'upcoming' ? upcoming.length : past.length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5 ${active ? 'bg-white shadow-soft' : ''}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text className={`text-sm font-medium ${active ? 'text-dark' : 'text-grayText'}`}>
                  {tab === 'upcoming' ? 'À venir' : 'Passés'}
                </Text>
                {count > 0 && (
                  <View className={`h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 ${active ? 'bg-primary' : 'bg-hairline'}`}>
                    <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-grayText'}`}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* List */}
        <Animated.View entering={FadeInDown.delay(120).duration(450)} className="mt-6 px-5">
          {displayed.length > 0 ? (
            <View className="gap-4">
              {displayed.map((appt, index) => {
                const isUpcoming = activeTab === 'upcoming' && appt.status !== 'cancelled' && appt.status !== 'completed';
                return (
                  <Animated.View key={appt.id} entering={FadeInDown.delay(140 + index * 40).duration(400)}>
                    <View className="overflow-hidden rounded-panel border-hairline bg-white shadow-panel">
                      <TouchableOpacity
                        onPress={() => setSelected(appt)}
                        activeOpacity={0.7}
                      >
                        <View className="p-4">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                              <Text className="text-base font-semibold text-dark">{appt.providerName}</Text>
                              <Text className="mt-0.5 text-xs font-medium text-grayText">{appt.providerSpecialty}</Text>
                            </View>
                            <StatusChip status={appt.status} />
                          </View>
                          <View className="mt-4 flex-row items-center gap-4">
                            <View className="h-12 w-12 items-center justify-center rounded-full border border-hairline bg-white">
                              <Text className="text-sm font-semibold text-primary">{formatDayNumber(appt.startsAt)}</Text>
                              <Text className="text-[10px] font-medium uppercase text-grayText">{formatMonth(appt.startsAt)}</Text>
                            </View>
                            <View className="flex-1 gap-1">
                              <View className="flex-row items-center gap-1.5">
                                <Ionicons name="time-outline" size={14} color="#3D4B64" />
                                <Text className="text-sm font-semibold text-dark">
                                  {formatTime(appt.startsAt)} – {formatTime(appt.endsAt)}
                                </Text>
                                {appt.price != null && (
                                  <Text className="ml-auto text-sm font-medium text-grayText">{appt.price} MAD</Text>
                                )}
                              </View>
                              {appt.facilityName && (
                                <View className="flex-row items-center gap-1.5">
                                  <Ionicons name="location-outline" size={14} color="#929292" />
                                  <Text className="text-xs text-grayText" numberOfLines={1}>
                                    {appt.facilityName}{appt.facilityCity ? `, ${appt.facilityCity}` : ''}
                                  </Text>
                                </View>
                              )}
                              <View className="flex-row items-center gap-1.5">
                                <Ionicons name="medkit-outline" size={14} color="#929292" />
                                <Text className="text-xs text-grayText">{appt.serviceName}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isUpcoming && (
                        <View className="flex-row gap-2 border-t border-hairline bg-softCloud/40 p-3">
                          <TouchableOpacity
                            className="flex-1 rounded-lg border border-hairline bg-white py-2.5"
                            activeOpacity={0.7}
                            onPress={() => Alert.alert('Reporter', 'La fonctionnalité de report sera bientôt disponible.')}
                          >
                            <Text className="text-center text-xs font-medium text-dark">Reporter</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 rounded-lg bg-primary py-2.5"
                            activeOpacity={0.8}
                            onPress={() => handleCancel(appt)}
                          >
                            <Text className="text-center text-xs font-medium text-white">Annuler</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <View className="mt-10 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="calendar" size={36} color="#F53E8A" />
              </View>
              <Text className="mt-6 text-lg font-semibold text-dark">
                {activeTab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
              </Text>
              <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
                {activeTab === 'upcoming'
                  ? 'Prenez rendez-vous avec un professionnel de santé.'
                  : 'Vos rendez-vous passés apparaîtront ici.'}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Detail modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white p-5 pb-8">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[22px] font-medium leading-[26px] tracking-[-0.44px] text-dark">
                    Détails du rendez-vous
                  </Text>
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <Ionicons name="calendar-outline" size={13} color="#929292" />
                    <Text className="text-xs font-medium text-grayText">{formatDateTime(selected.startsAt)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-softCloud"
                >
                  <Ionicons name="close" size={20} color="#3D4B64" />
                </TouchableOpacity>
              </View>

              <View className="mt-5 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
                <View className="flex-row items-center p-4">
                  <View className="h-12 w-12 items-center justify-center rounded-full border border-hairline bg-white">
                    <Text className="text-sm font-semibold text-primary">{formatDayNumber(selected.startsAt)}</Text>
                    <Text className="text-[10px] font-medium uppercase text-grayText">{formatMonth(selected.startsAt)}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-dark">{selected.providerName}</Text>
                    <Text className="mt-0.5 text-xs font-medium text-grayText">{selected.providerSpecialty}</Text>
                  </View>
                  <StatusChip status={selected.status} />
                </View>
                <View className="border-t border-hairline p-4">
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-sm font-medium text-grayText">Heure</Text>
                    <Text className="text-sm font-semibold text-dark">{formatTime(selected.startsAt)} – {formatTime(selected.endsAt)}</Text>
                  </View>
                  <View className="flex-row items-center justify-between py-1">
                    <Text className="text-sm font-medium text-grayText">Service</Text>
                    <Text className="text-sm font-semibold text-dark">{selected.serviceName}</Text>
                  </View>
                  {selected.price != null && (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-sm font-medium text-grayText">Prix</Text>
                      <Text className="text-sm font-semibold text-dark">{selected.price} MAD</Text>
                    </View>
                  )}
                  {selected.facilityName && (
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-sm font-medium text-grayText">Lieu</Text>
                      <Text className="text-sm font-semibold text-dark">{selected.facilityName}</Text>
                    </View>
                  )}
                  {selected.patientNotes && (
                    <View className="py-1">
                      <Text className="text-sm font-medium text-grayText">Notes</Text>
                      <Text className="mt-1 text-sm font-medium text-dark">{selected.patientNotes}</Text>
                    </View>
                  )}
                </View>
              </View>

              {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                <View className="mt-5 flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 rounded-lg border border-red-200 bg-white py-3"
                    activeOpacity={0.8}
                    onPress={() => handleCancel(selected)}
                    disabled={busy}
                  >
                    <Text className="text-center text-sm font-medium text-red-500">Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-primary py-3"
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelected(null);
                      Alert.alert('Reporter', 'La fonctionnalité de report sera bientôt disponible.');
                    }}
                  >
                    <Text className="text-center text-sm font-medium text-white">Reporter</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selected.status === 'completed' && patientId && (
                <ReviewSection
                  appointmentId={selected.id}
                  providerId={selected.providerId}
                  patientId={patientId}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
