import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceItem } from '@/lib/onboarding/onboarding-store';

const SERVICE_TYPES = [
  { value: 'consultation' as const, label: 'Consultation', icon: 'medkit' as const, color: '#F53E8A' },
  { value: 'treatment' as const, label: 'Soin / Traitement', icon: 'bandage' as const, color: '#8B5CF6' },
  { value: 'examination' as const, label: 'Examen', icon: 'search' as const, color: '#0D61B6' },
  { value: 'laboratory' as const, label: 'Laboratoire', icon: 'flask' as const, color: '#10B981' },
  { value: 'radiology' as const, label: 'Radiologie', icon: 'scan' as const, color: '#8B5CF6' },
  { value: 'vaccination' as const, label: 'Vaccination', icon: 'shield-checkmark' as const, color: '#F59E0B' },
  { value: 'other' as const, label: 'Autre', icon: 'ellipsis-horizontal' as const, color: '#6B7280' },
];

const BOOKING_MODES = [
  { value: 'office' as const, label: 'Au cabinet', icon: 'business' as const },
  { value: 'home' as const, label: 'À domicile', icon: 'car-sport' as const },
  { value: 'teleconsultation' as const, label: 'Téléconsultation', icon: 'videocam' as const },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

interface ServiceFormProps {
  initial?: ServiceItem;
  onSubmit: (service: ServiceItem) => void;
  onCancel: () => void;
}

/**
 * Full service editor used inside the onboarding services step.
 * Collects every field of a ServiceItem with inline validation.
 */
export function ServiceForm({ initial, onSubmit, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [serviceType, setServiceType] = useState<ServiceItem['serviceType']>(
    initial?.serviceType ?? 'consultation'
  );
  const [bookingMode, setBookingMode] = useState<ServiceItem['bookingMode']>(
    initial?.bookingMode ?? 'office'
  );
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [errors, setErrors] = useState<{ name?: string; price?: string; duration?: string }>({});

  const isEditing = !!initial;

  const validate = (): boolean => {
    const next: { name?: string; price?: string; duration?: string } = {};
    if (!name.trim()) next.name = 'Le nom du service est requis';
    const parsedPrice = parseFloat(price);
    if (price === '' || isNaN(parsedPrice) || parsedPrice < 0) {
      next.price = 'Indiquez un prix valide (≥ 0)';
    }
    if (!duration || duration <= 0) next.duration = 'La durée doit être supérieure à 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Alert.alert('Vérification', 'Veuillez corriger les champs signalés.');
      return;
    }
    onSubmit({
      id: initial?.id ?? `svc_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      serviceType,
      bookingMode,
      durationMinutes: duration,
      price: parseFloat(price) || 0,
    });
  };

  return (
    <View className="rounded-panel border border-primary-200 bg-white p-4 shadow-panel">
      {/* Header */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="add-circle" size={20} color="#F53E8A" />
          </View>
          <Text className="text-base font-semibold text-dark">
            {isEditing ? "Modifier le service" : 'Nouveau service'}
          </Text>
        </View>
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer">
          <Ionicons name="close" size={22} color="#929292" />
        </Pressable>
      </View>

      {/* Name */}
      <Field label="Nom du service" required error={errors.name}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="ex: Consultation générale"
          placeholderTextColor="#929292"
          className="py-3 text-sm font-medium text-dark"
        />
      </Field>

      {/* Service type */}
      <Text className="mb-1.5 text-sm font-medium text-dark">Type de service</Text>
      <View className="mb-4 gap-2">
        {SERVICE_TYPES.map((t) => {
          const selected = serviceType === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setServiceType(t.value)}
              className={`flex-row items-center gap-3 rounded-listing border px-4 py-3 ${
                selected ? 'bg-primary-50' : 'bg-white'
              }`}
              style={{ borderColor: selected ? '#F53E8A' : '#DDDDDD' }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${t.color}18` }}
              >
                <Ionicons name={t.icon} size={18} color={t.color} />
              </View>
              <Text className={`flex-1 text-sm font-medium ${selected ? 'text-primary' : 'text-dark'}`}>
                {t.label}
              </Text>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? '#F53E8A' : '#C4C4C4'}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Booking mode */}
      <Text className="mb-1.5 text-sm font-medium text-dark">Mode de réservation</Text>
      <View className="mb-4 flex-row gap-2">
        {BOOKING_MODES.map((m) => {
          const selected = bookingMode === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => setBookingMode(m.value)}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-3 ${
                selected ? 'bg-primary-50' : 'bg-white'
              }`}
              style={{ borderColor: selected ? '#F53E8A' : '#DDDDDD' }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Ionicons
                name={m.icon}
                size={16}
                color={selected ? '#F53E8A' : '#6a6a6a'}
              />
              <Text className={`text-sm font-medium ${selected ? 'text-primary' : 'text-dark'}`}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Duration */}
      <Text className="mb-1.5 text-sm font-medium text-dark">Durée</Text>
      <View className="mb-2 flex-row flex-wrap gap-2">
        {DURATION_PRESETS.map((d) => {
          const selected = duration === d;
          return (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              className={`rounded-full px-4 py-2 ${
                selected ? 'bg-primary' : 'bg-softCloud'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-dark'}`}>
                {d} min
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Durée personnalisée (minutes)" error={errors.duration}>
        <View className="flex-row items-center">
          <TextInput
            value={duration ? String(duration) : ''}
            onChangeText={(v) => setDuration(parseInt(v) || 0)}
            placeholder="30"
            placeholderTextColor="#929292"
            keyboardType="number-pad"
            className="py-3 text-sm font-medium text-dark"
          />
        </View>
      </Field>

      {/* Price */}
      <Field label="Prix (MAD)" required error={errors.price}>
        <View className="flex-row items-center">
          <Text className="mr-1 text-sm font-medium text-grayText">MAD</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="250"
            placeholderTextColor="#929292"
            keyboardType="decimal-pad"
            className="flex-1 py-3 text-sm font-medium text-dark"
          />
        </View>
      </Field>

      {/* Description */}
      <Field label="Description (optionnel)">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="ex: Consultation complète avec examen..."
          placeholderTextColor="#929292"
          multiline
          numberOfLines={3}
          className="py-3 text-sm font-medium text-dark"
        />
      </Field>

      {/* Actions */}
      <View className="mt-2 flex-row gap-2">
        <Pressable
          onPress={onCancel}
          className="flex-1 items-center justify-center rounded-lg border border-hairline bg-white px-4 py-3"
          accessibilityRole="button"
        >
          <Text className="text-sm font-medium text-dark">Annuler</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          className="flex-1 items-center justify-center rounded-lg bg-primary px-4 py-3"
          accessibilityRole="button"
        >
          <Text className="text-sm font-medium text-white">
            {isEditing ? 'Enregistrer' : 'Ajouter le service'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const borderColor = error ? '#c13515' : '#DDDDDD';
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-dark">
        {label}
        {required && <Text className="text-primary"> *</Text>}
      </Text>
      <View
        className="w-full flex-row items-center rounded-lg px-4"
        style={{ borderWidth: 1, borderColor }}
      >
        {children}
      </View>
      {error && <Text className="mt-1 text-xs text-[#c13515]">{error}</Text>}
    </View>
  );
}
