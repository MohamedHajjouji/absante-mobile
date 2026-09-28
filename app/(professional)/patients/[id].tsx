import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId, getPatientDossier } from '@/lib/services/provider-service';

type TabKey = 'dossier' | 'consultations' | 'prescriptions' | 'vitals' | 'documents';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dossier', label: 'Dossier' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'prescriptions', label: 'Ordonnances' },
  { key: 'vitals', label: 'Constantes' },
  { key: 'documents', label: 'Documents' },
];

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PatientDossierScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  // Deep links can deliver params as arrays — normalize to a single string.
  const patientId = (Array.isArray(rawId) ? rawId[0] : rawId) ?? '';

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('dossier');
  const [dossier, setDossier] = useState<
    { patient: any; consultations: any[]; prescriptions: any[]; vitals: any[]; documents: any[] } | null
  >(null);

  const load = useCallback(async () => {
    if (!user?.id || !patientId) return;
    try {
      const pid = await getProviderId(user.id);
      if (pid) setDossier(await getPatientDossier(patientId, pid));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger le dossier du patient.');
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  const p = dossier?.patient;
  const firstName = p?.first_name ?? '';
  const lastName = p?.last_name ?? '';
  const name = `${firstName} ${lastName}`.trim() || 'Patient';
  const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&color=ffffff&background=0D61B6`;
  // Normalize list shapes — a partial dossier must render empty states, never throw.
  const consultations = dossier?.consultations ?? [];
  const prescriptions = dossier?.prescriptions ?? [];
  const vitals = dossier?.vitals ?? [];
  const documents = dossier?.documents ?? [];

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full border-hairline bg-white p-3 shadow-soft"
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={24} color="#3D4B64" />
          </TouchableOpacity>
          <View className="ml-3 h-12 w-12 overflow-hidden rounded-full bg-secondary-tone-50">
            <Image source={{ uri: avatarUri }} className="h-full w-full" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xl font-semibold text-dark">{name}</Text>
            <Text className="mt-0.5 text-xs font-medium text-grayText">
              {[p?.gender ? (p.gender === 'male' ? 'Homme' : p.gender === 'female' ? 'Femme' : p.gender) : null, p?.birth_date ? formatDate(p.birth_date) : null]
                .filter(Boolean)
                .join(' · ') || 'Patient'}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        {(p?.phone || p?.email) && (
          <View className="mx-5 mt-4 rounded-panel border-hairline bg-white p-4 shadow-panel">
            {p?.phone ? (
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary-tone-50">
                  <Ionicons name="call-outline" size={16} color="#0D61B6" />
                </View>
                <Text className="ml-3 text-sm font-medium text-dark">{p.phone}</Text>
              </View>
            ) : null}
            {p?.email ? (
              <View className="mt-3 flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="mail-outline" size={16} color="#F53E8A" />
                </View>
                <Text className="ml-3 text-sm font-medium text-dark">{p.email}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border-hairline bg-white shadow-soft'}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
              >
                <Text className={`text-xs font-medium ${active ? 'text-white' : 'text-grayText'}`}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        <View className="mt-5 px-5">
          {tab === 'dossier' && (
            dossier?.patient && Object.keys(dossier.patient).filter((k) => ['blood_type', 'allergies', 'chronic_conditions', 'emergency_contact_name'].includes(k) && dossier.patient[k]).length === 0 ? (
              <EmptyBlock text="Aucune information médicale enregistrée." />
            ) : (
              <View className="overflow-hidden rounded-panel border border-hairline bg-white shadow-panel">
                {[
                  { label: 'Groupe sanguin', value: p?.blood_type },
                  { label: 'Allergies', value: p?.allergies },
                  { label: 'Maladies chroniques', value: p?.chronic_conditions },
                  {
                    label: "Contact d'urgence",
                    value: p?.emergency_contact_name
                      ? `${p.emergency_contact_name}${p.emergency_contact_phone ? ` · ${p.emergency_contact_phone}` : ''}`
                      : undefined,
                  },
                ]
                  .filter((row) => !!row.value)
                  .map((row, index) => (
                    <View key={row.label} className={index > 0 ? 'border-t border-hairline' : ''}>
                      <View className="p-4">
                        <Text className="text-xs font-medium text-grayText">{row.label}</Text>
                        <Text className="mt-0.5 text-sm font-medium text-dark">{row.value}</Text>
                      </View>
                    </View>
                  ))}
              </View>
            )
          )}

          {tab === 'consultations' && (
            consultations.length === 0 ? (
              <EmptyBlock text="Aucune consultation enregistrée." />
            ) : (
              <View className="gap-4">
                {consultations.map((c) => (
                  <View key={c.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                        <Ionicons name="chatbubble-ellipses" size={18} color="#F53E8A" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-xs font-medium text-primary">{formatDate(c.visit_date)}</Text>
                        <Text className="mt-0.5 text-sm font-medium text-dark">{c.reason ?? 'Consultation'}</Text>
                      </View>
                    </View>
                    {c.diagnosis ? (
                      <View className="mt-3 border-t border-hairline pt-3">
                        <Text className="text-xs font-medium text-grayText">Diagnostic</Text>
                        <Text className="mt-0.5 text-sm font-medium text-dark">{c.diagnosis}</Text>
                      </View>
                    ) : null}
                    {c.notes ? (
                      <Text className="mt-2 text-xs font-medium text-grayText">{c.notes}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )
          )}

          {tab === 'prescriptions' && (
            prescriptions.length === 0 ? (
              <EmptyBlock text="Aucune ordonnance enregistrée." />
            ) : (
              <View className="gap-4">
                {prescriptions.map((rx) => (
                  <View key={rx.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-success-50">
                        <Ionicons name="medkit" size={18} color="#10B981" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-sm font-medium text-dark">{rx.medication_name}</Text>
                        <Text className="mt-0.5 text-xs font-medium text-grayText">{formatDate(rx.prescribed_at)}</Text>
                      </View>
                    </View>
                    {rx.dosage ? (
                      <View className="mt-3 border-t border-hairline pt-3">
                        <Text className="text-xs font-medium text-grayText">Dosage</Text>
                        <Text className="mt-0.5 text-sm font-medium text-dark">{rx.dosage}</Text>
                      </View>
                    ) : null}
                    {(rx.frequency || rx.duration) ? (
                      <Text className="mt-2 text-xs font-medium text-grayText">
                        {[rx.frequency, rx.duration].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    {rx.instructions ? (
                      <Text className="mt-1 text-xs font-medium text-grayText">{rx.instructions}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )
          )}


          {tab === 'vitals' && (
            vitals.length === 0 ? (
              <EmptyBlock text="Aucune constante enregistrée." />
            ) : (
              <View className="gap-4">
                {vitals.map((v) => (
                  <View key={v.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
                    <View className="flex-row items-center">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-warning-50">
                        <Ionicons name="pulse" size={18} color="#F59E0B" />
                      </View>
                      <Text className="ml-3 text-xs font-medium text-primary">{formatDate(v.recorded_at)}</Text>
                    </View>
                    <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-3">
                      {v.blood_pressure_systolic != null ? (
                        <VitalsItem label="Tension" value={`${v.blood_pressure_systolic}/${v.blood_pressure_diastolic ?? '?'}`} />
                      ) : null}
                      {v.heart_rate != null ? <VitalsItem label="Pouls" value={`${v.heart_rate} bpm`} /> : null}
                      {v.temperature != null ? <VitalsItem label="Temp." value={`${v.temperature}°C`} /> : null}
                      {v.weight_kg != null ? <VitalsItem label="Poids" value={`${v.weight_kg} kg`} /> : null}
                      {v.oxygen_saturation != null ? <VitalsItem label="SpO2" value={`${v.oxygen_saturation}%`} /> : null}
                    </View>
                    {v.notes ? <Text className="mt-2 text-xs font-medium text-grayText">{v.notes}</Text> : null}
                  </View>
                ))}
              </View>
            )
          )}

          {tab === 'documents' && (
            documents.length === 0 ? (
              <EmptyBlock text="Aucun document." />
            ) : (
              <View className="gap-4">
                {documents.map((doc) => (
                  <View key={doc.id} className="flex-row items-center rounded-panel border-hairline bg-white p-4 shadow-panel">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                      <Ionicons name="document-text" size={20} color="#F53E8A" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-medium text-dark">{doc.title ?? 'Document'}</Text>
                      <Text className="mt-0.5 text-xs font-medium text-grayText">
                        {doc.document_type ?? ''} · {formatDate(doc.uploaded_at)}
                      </Text>
                    </View>
                    {doc.file_url ? (
                      <Ionicons name="download-outline" size={18} color="#929292" />
                    ) : null}
                  </View>
                ))}
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VitalsItem({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs font-medium text-grayText">{label}</Text>
      <Text className="text-sm font-medium text-dark">{value}</Text>
    </View>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <View className="items-center rounded-panel border border-hairline bg-white p-8 shadow-panel">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-softCloud">
        <Ionicons name="file-tray-outline" size={26} color="#929292" />
      </View>
      <Text className="mt-4 text-center text-sm font-medium text-grayText">{text}</Text>
    </View>
  );
}

