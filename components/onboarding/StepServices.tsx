import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useOnboardingStore,
  ServiceItem,
  WorkingHours,
} from '@/lib/onboarding/onboarding-store';
import { ServiceForm } from '@/components/onboarding/ServiceForm';

const WEEKDAYS = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
] as const;

const SERVICE_TYPE_META: Record<ServiceItem['serviceType'], { label: string; icon: string; color: string; bg: string }> = {
  consultation: { label: 'Consultation', icon: 'stethoscope', color: '#F53E8A', bg: '#fdeef4' },
  treatment: { label: 'Soin / Traitement', icon: 'bandage', color: '#8B5CF6', bg: '#f5f3ff' },
  examination: { label: 'Examen', icon: 'search', color: '#0D61B6', bg: '#ecf2fa' },
  laboratory: { label: 'Laboratoire', icon: 'flask', color: '#10B981', bg: '#ecfdf5' },
  radiology: { label: 'Radiologie', icon: 'scan', color: '#8B5CF6', bg: '#f5f3ff' },
  vaccination: { label: 'Vaccination', icon: 'shield-checkmark', color: '#F59E0B', bg: '#fffbeb' },
  other: { label: 'Autre', icon: 'ellipsis-horizontal', color: '#6B7280', bg: '#f3f4f6' },
};

const BOOKING_MODE_LABEL: Record<ServiceItem['bookingMode'], string> = {
  office: 'Au cabinet',
  home: 'À domicile',
  teleconsultation: 'Téléconsultation',
};

/**
 * Step 4 — Services and working hours.
 * Lets the professional add, edit and remove services with full details
 * (type, booking mode, duration, price) and configure weekly availability.
 */
export function StepServices() {
  const { services, addService, updateService, removeService, workingHours, setWorkingHours } =
    useOnboardingStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingService = editingId ? services.find((s) => s.id === editingId) ?? null : null;

  const openAdd = () => {
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (service: ServiceItem) => {
    if (editingId) {
      updateService(editingId, service);
    } else {
      addService(service);
    }
    closeForm();
  };

  const updateWorkingHour = (weekday: string, field: 'startTime' | 'endTime', value: string) => {
    const updated = workingHours.map((wh) =>
      wh.weekday === weekday ? { ...wh, [field]: value } : wh
    );
    setWorkingHours(updated);
  };

  const toggleWorkingDay = (weekday: string) => {
    const exists = workingHours.some((wh) => wh.weekday === weekday);
    if (exists) {
      setWorkingHours(workingHours.filter((wh) => wh.weekday !== weekday));
    } else {
      setWorkingHours([...workingHours, { weekday, startTime: '09:00', endTime: '17:00' }]);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        {/* ── Services section ── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-dark">
              Services proposés
            </Text>
            <Pressable
              onPress={openAdd}
              className="flex-row items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5"
              accessibilityRole="button"
              accessibilityLabel="Ajouter un service"
            >
              <Ionicons name="add" size={18} color="#F53E8A" />
              <Text className="text-xs font-semibold text-primary">Ajouter</Text>
            </Pressable>
          </View>

          {showForm ? (
            <View className="mt-3">
              <ServiceForm
                initial={editingService ?? undefined}
                onSubmit={handleSubmit}
                onCancel={closeForm}
              />
            </View>
          ) : services.length === 0 ? (
            <View className="mt-4 items-center py-8">
              <Ionicons name="cube-outline" size={40} color="#DDDDDD" />
              <Text className="mt-2 text-sm font-medium text-grayText">
                Aucun service ajouté pour le moment.
              </Text>
              <Text className="mt-1 text-xs text-grayText">
                Ajoutez votre premier service pour continuer.
              </Text>
            </View>
          ) : (
            <View className="mt-3 gap-3">
              {services.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onEdit={() => openEdit(svc.id)}
                  onRemove={() => removeService(svc.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Working hours section ── */}
        <View>
          <Text className="text-sm font-semibold text-dark">
            Horaires de travail
          </Text>
          <Text className="mt-1 text-xs text-grayText">
            Activez les jours où vous êtes disponible et ajustez les horaires.
          </Text>

          <View className="mt-3 gap-2">
            {WEEKDAYS.map((day) => {
              const wh = workingHours.find((w) => w.weekday === day.value);
              const isActive = !!wh;
              return (
                <View
                  key={day.value}
                  className={`rounded-listing border bg-white p-3 shadow-panel ${
                    isActive ? 'border-hairline' : 'border-hairline bg-softCloud'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Pressable
                      onPress={() => toggleWorkingDay(day.value)}
                      className="flex-row items-center gap-2"
                      accessibilityRole="switch"
                      accessibilityState={{ checked: isActive }}
                    >
                      <Ionicons
                        name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isActive ? '#F53E8A' : '#C4C4C4'}
                      />
                      <Text className={`text-sm font-medium ${isActive ? 'text-dark' : 'text-grayText'}`}>
                        {day.label}
                      </Text>
                    </Pressable>

                    {isActive && (
                      <View className="flex-row items-center gap-2">
                        <TextInput
                          placeholder="09:00"
                          value={wh.startTime}
                          onChangeText={(v) => updateWorkingHour(day.value, 'startTime', v)}
                          className="w-16 rounded-lg border border-hairline bg-white px-2 py-2 text-center text-sm text-dark"
                          placeholderTextColor="#929292"
                        />
                        <Text className="text-xs text-grayText">—</Text>
                        <TextInput
                          placeholder="17:00"
                          value={wh.endTime}
                          onChangeText={(v) => updateWorkingHour(day.value, 'endTime', v)}
                          className="w-16 rounded-lg border border-hairline bg-white px-2 py-2 text-center text-sm text-dark"
                          placeholderTextColor="#929292"
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

interface ServiceCardProps {
  service: ServiceItem;
  onEdit: () => void;
  onRemove: () => void;
}

function ServiceCard({ service, onEdit, onRemove }: ServiceCardProps) {
  const meta = SERVICE_TYPE_META[service.serviceType];
  const typeIcon = meta.icon as keyof typeof Ionicons.glyphMap;

  return (
    <View className="rounded-panel border border-hairline bg-white p-4 shadow-panel">
      <View className="flex-row items-start">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: meta.bg }}
        >
          <Ionicons name={typeIcon} size={20} color={meta.color} />
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-dark">{service.name}</Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-0.5"
              style={{ backgroundColor: meta.bg }}
            >
              <Ionicons name={typeIcon} size={11} color={meta.color} />
              <Text className="text-[11px] font-medium" style={{ color: meta.color }}>
                {meta.label}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={12} color="#929292" />
              <Text className="text-xs text-grayText">{service.durationMinutes} min</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="flash-outline" size={12} color="#929292" />
              <Text className="text-xs text-grayText">{BOOKING_MODE_LABEL[service.bookingMode]}</Text>
            </View>
          </View>
          {!!service.description && (
            <Text className="mt-1.5 text-xs leading-4 text-grayText" numberOfLines={2}>
              {service.description}
            </Text>
          )}
        </View>

        <View className="items-end gap-2">
          <Text className="text-sm font-semibold text-primary">
            {service.price > 0 ? `${service.price} MAD` : 'Gratuit'}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={onEdit}
              className="rounded-full bg-softCloud p-2"
              accessibilityRole="button"
              accessibilityLabel="Modifier le service"
            >
              <Ionicons name="pencil" size={16} color="#3D4B64" />
            </Pressable>
            <Pressable
              onPress={onRemove}
              className="rounded-full bg-red-50 p-2"
              accessibilityRole="button"
              accessibilityLabel="Supprimer le service"
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
