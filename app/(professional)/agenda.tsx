import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { StatusChip } from '@/components/ui/StatusChip';
import {
  getProviderId,
  getProviderAppointments,
  getProviderServices,
  getProviderPatients,
  getPrimaryCalendar,
  updateAppointmentStatus,
  createAppointment,
  ProviderAppointment,
  ProviderService,
  PatientSum,
} from '@/lib/services/provider-service';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatDayNumber(iso: string) {
  return new Date(iso).getDate().toString();
}

function formatMonth(iso: string) {
  return new Date(iso)
    .toLocaleDateString('fr-FR', { month: 'short' })
    .replace('.', '');
}

function todayDateString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

interface ActionDef {
  key: string;
  label: string;
  bg: string;
  text: string;
  onPress: () => void;
}

function buildActions(appt: ProviderAppointment, run: (status: string) => void): ActionDef[] {
  switch (appt.status) {
    case 'pending':
      return [
        { key: 'confirm', label: 'Confirmer', bg: 'bg-primary', text: 'text-white', onPress: () => run('confirmed') },
        { key: 'cancel-p', label: 'Annuler', bg: 'bg-white border border-red-200', text: 'text-red-500', onPress: () => run('cancelled') },
      ];
    case 'confirmed':
      return [
        { key: 'complete', label: 'Terminer', bg: 'bg-success', text: 'text-white', onPress: () => run('completed') },
        { key: 'cancel-c', label: 'Annuler', bg: 'bg-white border border-red-200', text: 'text-red-500', onPress: () => run('cancelled') },
      ];
    default:
      return [];
  }
}

export default function ProfessionalAgendaScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<ProviderAppointment[]>([]);
  const [selected, setSelected] = useState<ProviderAppointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      setProviderId(pid);
      if (pid) setAppointments(await getProviderAppointments(pid));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger vos rendez-vous.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const runStatus = async (appt: ProviderAppointment, status: string) => {
    setBusy(true);
    try {
      const res = await updateAppointmentStatus(appt.id, status);
      if (!res.success) {
        Alert.alert('Erreur', res.error ?? 'Impossible de mettre à jour le rendez-vous.');
        return;
      }
      setSelected(null);
      await load();
    } catch (e) {
      console.error('Failed to update appointment status:', e);
      Alert.alert('Erreur', 'Impossible de mettre à jour. Vérifiez votre connexion.');
    } finally {
      setBusy(false);
    }
  };

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.startsAt) >= now);
  const past = appointments.filter((a) => new Date(a.startsAt) < now);
  const list = activeTab === 'upcoming' ? upcoming : past;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
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
        <View className="flex-row items-center justify-between px-5 pt-4">
          <View>
            <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Agenda</Text>
            <Text className="mt-0.5 text-sm font-medium text-grayText">Gérez vos rendez-vous</Text>
          </View>
          <TouchableOpacity
            onPress={() => setCreateOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary shadow-pill"
            accessibilityRole="button"
            accessibilityLabel="Créer un rendez-vous"
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="mx-5 mt-5 flex-row rounded-full bg-softCloud p-1">
          {(['upcoming', 'past'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 rounded-full py-2.5 ${active ? 'bg-white shadow-soft' : ''}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab === 'upcoming' ? 'Rendez-vous à venir' : 'Rendez-vous passés'}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    active ? 'text-dark' : 'text-grayText'
                  }`}
                >
                  {tab === 'upcoming' ? 'À venir' : 'Passés'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        <View className="mt-5 px-5">
          {list.length === 0 ? (
            <View className="mt-10 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="calendar" size={36} color="#F53E8A" />
              </View>
              <Text className="mt-6 text-lg font-semibold text-dark">
                {activeTab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
              </Text>
              <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
                {activeTab === 'upcoming'
                  ? 'Planifiez votre prochain rendez-vous pour démarrer la journée.'
                  : 'Vos rendez-vous passés apparaîtront ici.'}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  onPress={() => setCreateOpen(true)}
                  className="mt-6 flex-row items-center justify-center rounded-lg bg-primary px-6 py-3"
                  accessibilityRole="button"
                  accessibilityLabel="Créer un rendez-vous"
                >
                  <Ionicons name="add" size={18} color="#ffffff" />
                  <Text className="ml-1.5 text-sm font-medium text-white">Créer un rendez-vous</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View className="gap-4">
              {list.map((appt) => {
                const actions = buildActions(appt, (s) => runStatus(appt, s));
                return (
                  <View key={appt.id} className="overflow-hidden rounded-panel border-hairline bg-white shadow-panel">
                    <TouchableOpacity
                      onPress={() => setSelected(appt)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Détails du rendez-vous de ${appt.patientName}`}
                    >
                      <View className="p-4">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-base font-semibold text-dark">{appt.patientName}</Text>
                            <Text className="mt-0.5 text-xs font-medium text-grayText">
                              {appt.serviceName ?? 'Consultation'}
                            </Text>
                          </View>
                          <StatusChip status={appt.status} />
                        </View>

                        <View className="mt-4 flex-row items-center gap-4">
                          <View className="h-12 w-12 items-center justify-center rounded-full border border-hairline bg-white">
                            <Text className="text-sm font-semibold text-primary">
                              {formatDayNumber(appt.startsAt)}
                            </Text>
                            <Text className="text-[10px] font-medium uppercase text-grayText">
                              {formatMonth(appt.startsAt)}
                            </Text>
                          </View>
                          <View className="flex-1 gap-1">
                            <View className="flex-row items-center gap-1.5">
                              <Ionicons name="time-outline" size={14} color="#3D4B64" />
                              <Text className="text-sm font-semibold text-dark">
                                {formatTime(appt.startsAt)}
                              </Text>
                              {appt.servicePrice != null ? (
                                <Text className="ml-auto text-sm font-medium text-grayText">
                                  {appt.servicePrice} MAD
                                </Text>
                              ) : null}
                            </View>
                            <Text className="text-xs font-medium text-grayText">
                              {formatDateTime(appt.startsAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {actions.length > 0 && activeTab === 'upcoming' && (
                      <View className="flex-row gap-2 border-t border-hairline bg-softCloud/40 p-3">
                        {actions.map((act) => (
                          <TouchableOpacity
                            key={act.key}
                            onPress={act.onPress}
                            disabled={busy}
                            className={`flex-1 rounded-lg py-2.5 ${act.bg}`}
                            accessibilityRole="button"
                            accessibilityLabel={act.label}
                          >
                            <Text className={`text-center text-xs font-medium ${act.text}`}>
                              {act.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
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
                      <Text className="text-xs font-medium text-grayText">
                        {formatDateTime(selected.startsAt)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelected(null)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-softCloud"
                    accessibilityRole="button"
                    accessibilityLabel="Fermer"
                  >
                    <Ionicons name="close" size={20} color="#3D4B64" />
                  </TouchableOpacity>
                </View>

                <View className="mt-5 overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
                  <View className="flex-row items-center p-4">
                    <View className="h-12 w-12 items-center justify-center rounded-full border border-hairline bg-white">
                      <Text className="text-sm font-semibold text-primary">
                        {formatDayNumber(selected.startsAt)}
                      </Text>
                      <Text className="text-[10px] font-medium uppercase text-grayText">
                        {formatMonth(selected.startsAt)}
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-dark">{selected.patientName}</Text>
                      <Text className="mt-0.5 text-xs font-medium text-grayText">
                        {selected.serviceName ?? 'Consultation'}
                      </Text>
                    </View>
                    <StatusChip status={selected.status} />
                  </View>

                  <View className="border-t border-hairline p-4">
                    <View className="flex-row items-center justify-between py-1">
                      <Text className="text-sm font-medium text-grayText">Heure</Text>
                      <Text className="text-sm font-semibold text-dark">{formatTime(selected.startsAt)}</Text>
                    </View>
                    {selected.servicePrice != null && (
                      <View className="flex-row items-center justify-between py-1">
                        <Text className="text-sm font-medium text-grayText">Prix</Text>
                        <Text className="text-sm font-semibold text-dark">{selected.servicePrice} MAD</Text>
                      </View>
                    )}
                    {selected.patientPhone ? (
                      <View className="flex-row items-center justify-between py-1">
                        <Text className="text-sm font-medium text-grayText">Téléphone</Text>
                        <Text className="text-sm font-semibold text-dark">{selected.patientPhone}</Text>
                      </View>
                    ) : null}
                    {selected.reason ? (
                      <View className="py-1">
                        <Text className="text-sm font-medium text-grayText">Motif</Text>
                        <Text className="mt-1 text-sm font-medium text-dark">{selected.reason}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {buildActions(selected, (s) => runStatus(selected, s)).length > 0 && (
                  <View className="mt-5 flex-row gap-2">
                    {buildActions(selected, (s) => runStatus(selected, s)).map((act) => (
                      <TouchableOpacity
                        key={act.key}
                        onPress={act.onPress}
                        disabled={busy}
                        className={`flex-1 rounded-lg py-3 ${act.bg}`}
                        accessibilityRole="button"
                        accessibilityLabel={act.label}
                      >
                        <Text className={`text-center text-sm font-medium ${act.text}`}>{act.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Create appointment modal */}
        <CreateAppointmentModal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          providerId={providerId}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      </SafeAreaView>
  );
}

function CreateAppointmentModal({
  visible,
  onClose,
  providerId,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  providerId: string | null;
  onCreated: () => void;
}) {
  const [services, setServices] = useState<ProviderService[]>([]);
  const [patients, setPatients] = useState<PatientSum[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    if (!providerId) return;
    try {
      const [svcs, pats] = await Promise.all([
        getProviderServices(providerId),
        getProviderPatients(providerId),
      ]);
      setServices(svcs);
      setPatients(pats);
    } catch (e) {
      console.error('Failed to load appointment options:', e);
      setError("Impossible de charger les options. Vérifiez votre connexion.");
    }
  }, [providerId]);

  useEffect(() => {
    if (visible) {
      setError(null);
      setDate(todayDateString());
      loadOptions();
    }
  }, [visible, loadOptions]);

  const handleCreate = async () => {
    if (!providerId || !serviceId || !patientId) {
      setError('Veuillez sélectionner un patient et un service.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date invalide — utilisez le format AAAA-MM-JJ.');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError('Heure invalide — utilisez le format HH:MM (ex. 09:30).');
      return;
    }
    const service = services.find((s) => s.id === serviceId);
    const duration = service?.durationMinutes ?? 30;
    const start = new Date(`${date}T${time}`);
    if (Number.isNaN(start.getTime())) {
      setError('Date ou heure invalide.');
      return;
    }
    const end = new Date(start.getTime() + duration * 60000);
    setSaving(true);
    try {
      const calendarId = await getPrimaryCalendar(providerId);
      if (!calendarId) {
        setError('Aucun calendrier de disponibilité trouvé.');
        return;
      }
      const res = await createAppointment({
        providerId,
        calendarId,
        serviceId,
        patientId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        notes: notes || undefined,
      });
      if (!res.success) {
        setError(res.error ?? 'Impossible de créer le rendez-vous.');
        return;
      }
    } catch (e) {
      console.error('Failed to create appointment:', e);
      setError("Impossible de créer le rendez-vous. Vérifiez votre connexion.");
      return;
    } finally {
      setSaving(false);
    }
    setServiceId(null);
    setPatientId(null);
    setDate('');
    setTime('');
    setNotes('');
    onCreated();
  };


  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white p-5 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-dark">Nouveau rendez-vous</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close" size={24} color="#3D4B64" />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {/* Patient */}
            <Text className="text-sm font-semibold text-dark">Patient</Text>
            {patients.length === 0 ? (
              <Text className="mt-2 text-xs font-medium text-grayText">Aucun patient disponible.</Text>
            ) : (
              <View className="mt-2 gap-2">
                {patients.map((p) => {
                  const selectedPat = patientId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setPatientId(p.id)}
                      className={`flex-row items-center rounded-listing border px-3 py-2.5 ${
                        selectedPat ? 'border-primary bg-primary-50' : 'border-hairline bg-white'
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedPat }}
                      accessibilityLabel={`Sélectionner ${p.firstName} ${p.lastName}`}
                    >
                      <View className={`h-9 w-9 items-center justify-center rounded-full ${selectedPat ? 'bg-primary' : 'bg-softCloud'}`}>
                        <Ionicons name="person" size={16} color={selectedPat ? '#FFFFFF' : '#6a6a6a'} />
                      </View>
                      <Text className={`ml-3 flex-1 text-sm ${selectedPat ? 'text-primary' : 'text-dark'}`}>
                        {p.firstName} {p.lastName}
                      </Text>
                      <View className={`h-5 w-5 items-center justify-center rounded-full border ${selectedPat ? 'border-primary bg-primary' : 'border-hairline'}`}>
                        {selectedPat ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Service */}
            <Text className="mt-4 text-sm font-semibold text-dark">Prestation</Text>
            {services.length === 0 ? (
              <Text className="mt-2 text-xs font-medium text-grayText">Aucun service disponible.</Text>
            ) : (
              <View className="mt-2 gap-2">
                {services.map((s) => {
                  const selectedSvc = serviceId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setServiceId(s.id)}
                      className={`flex-row items-center justify-between rounded-listing border px-3 py-2.5 ${
                        selectedSvc ? 'border-primary bg-primary-50' : 'border-hairline bg-white'
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedSvc }}
                      accessibilityLabel={`Sélectionner ${s.name}`}
                    >
                      <View className={`h-9 w-9 items-center justify-center rounded-full ${selectedSvc ? 'bg-primary' : 'bg-softCloud'}`}>
                        <Ionicons name="briefcase" size={16} color={selectedSvc ? '#FFFFFF' : '#6a6a6a'} />
                      </View>
                      <Text className={`ml-3 flex-1 text-sm ${selectedSvc ? 'text-primary' : 'text-dark'}`}>
                        {s.name}
                      </Text>
                      <Text className="text-xs font-medium text-grayText">{s.price} MAD</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}


            {/* Date / time */}
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Date</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#929292"
                  value={date}
                  onChangeText={setDate}
                  autoCapitalize="none"
                  accessibilityLabel="Date du rendez-vous"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Heure</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  placeholder="HH:MM"
                  placeholderTextColor="#929292"
                  value={time}
                  onChangeText={setTime}
                  autoCapitalize="none"
                  accessibilityLabel="Heure du rendez-vous"
                />
              </View>
            </View>

            {/* Notes */}
            <View className="mt-4">
              <Text className="text-sm font-semibold text-dark">Notes</Text>
              <TextInput
                className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                placeholder="Motif / notes"
                placeholderTextColor="#929292"
                value={notes}
                onChangeText={setNotes}
                multiline
                accessibilityLabel="Notes du rendez-vous"
              />
            </View>

            {error && (
              <View className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs text-[#c13515]">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={saving}
              className="mt-5 items-center justify-center rounded-lg bg-primary py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Créer le rendez-vous"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-medium text-white">Créer le rendez-vous</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

