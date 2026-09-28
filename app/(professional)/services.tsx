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
import { SwitchPill } from '@/components/ui/SwitchPill';
import {
  getProviderId,
  getProviderServices,
  deleteProviderService,
  toggleProviderServiceActive,
  createProviderService,
  updateProviderService,
  ProviderService,
} from '@/lib/services/provider-service';

export default function ServicesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderService | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      setProviderId(pid);
      if (pid) setServices(await getProviderServices(pid));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger vos services.');
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

  const handleToggle = async (id: string, current: boolean) => {
    const res = await toggleProviderServiceActive(id, !current);
    if (!res.success) {
      Alert.alert('Erreur', res.error ?? 'Impossible de modifier le service.');
      return;
    }
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !current } : s))
    );
  };

  const handleDelete = (service: ProviderService) => {
    Alert.alert(
      'Supprimer ce service',
      `Voulez-vous vraiment supprimer « ${service.name} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteProviderService(service.id);
            if (!res.success) {
              Alert.alert('Erreur', res.error ?? 'Impossible de supprimer le service.');
              return;
            }
            setServices((prev) => prev.filter((s) => s.id !== service.id));
          },
        },
      ],
      { cancelable: true }
    );
  };

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
            <Text className="text-2xl font-semibold tracking-[-0.3px] text-dark">Mes services</Text>
            <Text className="mt-0.5 text-sm font-medium text-grayText">
              {services.length > 0
                ? `${services.length} prestation${services.length > 1 ? 's' : ''}`
                : 'Gérez vos prestations'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary shadow-pill"
            accessibilityRole="button"
            accessibilityLabel="Ajouter un service"
          >
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
{/* List */}
        <View className="mt-5 px-5">
          {services.length === 0 ? (
            <View className="mt-10 items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="briefcase" size={36} color="#F53E8A" />
              </View>
              <Text className="mt-6 text-lg font-semibold text-dark">Aucun service</Text>
              <Text className="mt-2 text-center text-sm font-medium leading-6 text-grayText">
                Ajoutez une prestation pour commencer à recevoir des rendez-vous.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="mt-6 flex-row items-center justify-center rounded-lg bg-primary px-6 py-3"
                accessibilityRole="button"
                accessibilityLabel="Ajouter un service"
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text className="ml-1.5 text-sm font-medium text-white">Ajouter un service</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-4">
              {services.map((s) => {
                const meta = SERVICE_TYPE_META[s.serviceType] ?? SERVICE_TYPE_META.other;
                return (
                  <View key={s.id} className="overflow-hidden rounded-panel border-hairline bg-white shadow-panel">
                    <View className="p-4">
                      <View className="flex-row items-center">
                        <View className={`h-12 w-12 items-center justify-center rounded-full ${meta.tint}`}>
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-base font-semibold text-dark">{s.name}</Text>
                          <Text className="mt-0.5 text-sm font-medium text-grayText">
                            {s.price} MAD · {s.durationMinutes} min
                          </Text>
                        </View>
                        <SwitchPill
                          value={s.active}
                          onToggle={() => handleToggle(s.id, s.active)}
                          accessibilityLabel={`Activer ${s.name}`}
                        />
                      </View>

                      {s.description ? (
                        <Text className="mt-3 text-xs font-medium leading-5 text-grayText">
                          {s.description}
                        </Text>
                      ) : null}

                      <View className="mt-3 flex-row gap-2">
                        <Text className="rounded-full bg-secondary-tone-50 px-2 py-0.5 text-[11px] font-medium text-secondary-tone">
                          {meta.label}
                        </Text>
                        <Text className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {BOOKING_MODES.find((m) => m.value === s.bookingMode)?.label ?? s.bookingMode}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row gap-2 border-t border-hairline bg-softCloud/40 p-3">
                      <TouchableOpacity
                        onPress={() => {
                          setEditing(s);
                          setFormOpen(true);
                        }}
                        className="flex-1 flex-row items-center justify-center rounded-lg border-hairline bg-white py-2.5"
                        accessibilityRole="button"
                        accessibilityLabel={`Modifier ${s.name}`}
                      >
                        <Ionicons name="create-outline" size={15} color="#3D4B64" />
                        <Text className="ml-1.5 text-xs font-medium text-dark">Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(s)}
                        className="flex-1 flex-row items-center justify-center rounded-lg border border-red-100 bg-red-50 py-2.5"
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer ${s.name}`}
                      >
                        <Ionicons name="trash-outline" size={15} color="#c13515" />
                        <Text className="ml-1.5 text-xs font-medium text-[#c13515]">Supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add / edit modal */}
      <ServiceFormModal
        visible={formOpen}
        initial={editing}
        providerId={providerId}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

const SERVICE_TYPE_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; tint: string; label: string }
> = {
  consultation: { icon: 'business', color: '#F53E8A', tint: 'bg-primary-50', label: 'Consultation' },
  treatment: { icon: 'medkit', color: '#0D61B6', tint: 'bg-secondary-tone-50', label: 'Traitement' },
  examination: { icon: 'body', color: '#3578FF', tint: 'bg-blue-50', label: 'Examen' },
  laboratory: { icon: 'flask', color: '#10B981', tint: 'bg-success-50', label: 'Laboratoire' },
  radiology: { icon: 'scan', color: '#8B5CF6', tint: 'bg-purple-50', label: 'Radiologie' },
  vaccination: { icon: 'shield-checkmark', color: '#F59E0B', tint: 'bg-yellow-50', label: 'Vaccination' },
  other: { icon: 'ellipsis-horizontal', color: '#6B7280', tint: 'bg-gray-100', label: 'Autre' },
};

const SERVICE_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Traitement' },
  { value: 'examination', label: 'Examen' },
  { value: 'laboratory', label: 'Laboratoire' },
  { value: 'radiology', label: 'Radiologie' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'other', label: 'Autre' },
];

const BOOKING_MODES = [
  { value: 'office', label: 'Au cabinet' },
  { value: 'home', label: 'À domicile' },
  { value: 'teleconsultation', label: 'Téléconsultation' },
];

function ServiceFormModal({
  visible,
  initial,
  providerId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial: ProviderService | null;
  providerId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [serviceType, setServiceType] = useState('consultation');
  const [bookingMode, setBookingMode] = useState('office');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setPrice(initial ? String(initial.price) : '');
      setDuration(initial ? String(initial.durationMinutes) : '');
      setServiceType(initial?.serviceType ?? 'consultation');
      setBookingMode(initial?.bookingMode ?? 'office');
      setError(null);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    if (!providerId) return;
    if (!name.trim()) {
      setError('Le nom du service est obligatoire.');
      return;
    }
    const priceNum = Number(price);
    const durationNum = Number(duration);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Veuillez saisir un prix valide.');
      return;
    }
    if (Number.isNaN(durationNum) || durationNum <= 0) {
      setError('Veuillez saisir une durée valide.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNum,
      durationMinutes: durationNum,
      serviceType,
      bookingMode,
    };

    setSaving(true);
    const res = initial
      ? await updateProviderService(initial.id, payload)
      : await createProviderService(providerId, payload);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Impossible de sauvegarder le service.');
      return;
    }
    onSaved();
  };


  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-white p-5 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-dark">
              {initial ? 'Modifier le service' : 'Nouveau service'}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close" size={24} color="#3D4B64" />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-sm font-semibold text-dark">Nom du service</Text>
            <TextInput
              className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
              placeholder="ex : Consultation générale"
              placeholderTextColor="#929292"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Nom du service"
            />

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Prix (MAD)</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  placeholder="300"
                  placeholderTextColor="#929292"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  accessibilityLabel="Prix du service"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-dark">Durée (min)</Text>
                <TextInput
                  className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                  placeholder="30"
                  placeholderTextColor="#929292"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  accessibilityLabel="Durée du service"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-dark">Description</Text>
              <TextInput
                className="mt-2 rounded-listing border border-hairline bg-white px-3 py-2.5 text-sm text-dark"
                placeholder="Description du service (optionnel)"
                placeholderTextColor="#929292"
                value={description}
                onChangeText={setDescription}
                multiline
                accessibilityLabel="Description du service"
              />
            </View>

            {/* Type */}
            <Text className="mt-4 text-sm font-semibold text-dark">Type de prestation</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SERVICE_TYPES.map((t) => {
                const active = serviceType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setServiceType(t.value)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-softCloud'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t.label}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-grayText'}`}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Booking mode */}
            <Text className="mt-4 text-sm font-semibold text-dark">Mode de réservation</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {BOOKING_MODES.map((m) => {
                const active = bookingMode === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setBookingMode(m.value)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-secondary-tone' : 'bg-softCloud'}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={m.label}
                  >
                    <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-grayText'}`}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error && (
              <View className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-xs text-[#c13515]">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="mt-5 items-center justify-center rounded-lg bg-primary py-3.5"
              accessibilityRole="button"
              accessibilityLabel="Enregistrer le service"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-base font-medium text-white">
                  {initial ? 'Enregistrer' : 'Créer le service'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

