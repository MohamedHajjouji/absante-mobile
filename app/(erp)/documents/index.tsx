import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { erpFetch, erpInsert } from '@/lib/erp/client';
import type { Document } from '@/lib/erp/types';
import { ErpEmptyState } from '@/components/erp/ErpEmptyState';
import { ErpBottomSheet } from '@/components/erp/ErpBottomSheet';
import {
  pickAnyFile,
  pickImageFromLibrary,
  takePhoto,
  uploadErpFile,
  type PickedFile,
} from '@/lib/services/erp/storage-service';

const ENTITY_TYPES = [
  { value: 'invoices', label: 'Factures', table: 'invoices', number: 'invoice_number' },
  { value: 'expenses', label: 'Dépenses', table: 'expenses', number: 'expense_number' },
  { value: 'quotes', label: 'Devis', table: 'quotes', number: 'quote_number' },
  { value: 'purchases', label: 'Achats', table: 'purchases', number: 'purchase_number' },
  { value: 'service_orders', label: 'Ordres', table: 'service_orders', number: 'order_number' },
  { value: 'products', label: 'Produits', table: 'products', number: 'name' },
  { value: 'assets', label: 'Actifs', table: 'assets', number: 'asset_reference' },
  { value: 'customers', label: 'Clients', table: 'customers', number: 'name' },
  { value: 'suppliers', label: 'Fournisseurs', table: 'suppliers', number: 'name' },
  { value: 'rentals', label: 'Locations', table: 'rentals', number: 'rental_number' },
];

const DOC_TYPES = [
  { value: 'receipt', label: 'Reçu' },
  { value: 'invoice', label: 'Facture' },
  { value: 'contract', label: 'Contrat' },
  { value: 'photo', label: 'Photo' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'report', label: 'Rapport' },
  { value: 'other', label: 'Autre' },
];

const DOC_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  receipt: 'receipt',
  invoice: 'document-text',
  contract: 'document-lock',
  photo: 'image',
  certificate: 'ribbon',
  report: 'bar-chart',
  other: 'document-attach',
};

export default function DocumentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [docs, setDocs] = useState<Document[]>([]);

  // Upload sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entityType, setEntityType] = useState('invoices');
  const [entityId, setEntityId] = useState('');
  const [entityOptions, setEntityOptions] = useState<{ id: string; label: string }[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [docType, setDocType] = useState('receipt');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const q = search.trim() || undefined;
      setDocs(
        await erpFetch<Document>('documents', {
          select: 'id,entity_type,entity_id,file_url,file_name,document_type,file_size,created_at',
          search: q ? { query: q, columns: ['file_name', 'document_type'] } : undefined,
          filters: entityFilter ? { entity_type: entityFilter } : undefined,
          order: { column: 'created_at', ascending: false },
          limit: 200,
        })
      );
    } catch (e) {
      console.error('Documents load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, entityFilter]);

  useEffect(() => {
    load(true);
  }, [entityFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(false), 400);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const loadEntityOptions = useCallback(async (type: string) => {
    const cfg = ENTITY_TYPES.find((e) => e.value === type);
    if (!cfg) return;
    setLoadingEntities(true);
    try {
      const rows = await erpFetch<any>(cfg.table, {
        select: `id,${cfg.number}`,
        order: { column: 'created_at', ascending: false },
        limit: 50,
      });
      setEntityOptions(rows.map((r: any) => ({ id: r.id, label: String(r[cfg.number] ?? '—') })));
    } catch (e) {
      console.error('Entity options load', e);
      setEntityOptions([]);
    } finally {
      setLoadingEntities(false);
    }
  }, []);

  const openSheet = () => {
    setEntityType('invoices');
    setEntityId('');
    setDocType('receipt');
    setFile(null);
    setSheetOpen(true);
    loadEntityOptions('invoices');
  };

  const pickEntityType = (type: string) => {
    setEntityType(type);
    setEntityId('');
    loadEntityOptions(type);
  };

  const chooseFile = () => {
    Alert.alert('Choisir un fichier', 'Source', [
      { text: 'Photo', onPress: async () => setFile(await takePhoto().catch(() => null)) },
      { text: 'Galerie', onPress: async () => setFile(await pickImageFromLibrary().catch(() => null)) },
      { text: 'Fichier', onPress: async () => setFile(await pickAnyFile().catch(() => null)) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleUpload = async () => {
    if (!entityId) {
      Alert.alert('Erreur', 'Choisissez le document lié.');
      return;
    }
    if (!file) {
      Alert.alert('Erreur', 'Choisissez un fichier.');
      return;
    }
    setUploading(true);
    setSaving(true);
    try {
      const up = await uploadErpFile(file, entityType);
      if (!up.ok) {
        Alert.alert('Échec', up.message ?? 'Téléversement impossible.');
        return;
      }
      const res = await erpInsert('documents', {
        entity_type: entityType,
        entity_id: entityId,
        file_url: up.url,
        file_name: file.name,
        document_type: docType,
        file_size: file.size,
      });
      if (!res.ok) {
        Alert.alert('Erreur', res.message ?? 'Enregistrement impossible.');
        return;
      }
      setSheetOpen(false);
      setFile(null);
      load();
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const openDoc = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Erreur', 'Impossible d’ouvrir ce fichier.');
    } catch {
      Alert.alert('Erreur', 'Impossible d’ouvrir ce fichier.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Documents',
          headerTintColor: '#3D4B64',
          headerStyle: { backgroundColor: '#FEFBFC' },
          headerShadowVisible: false,
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F53E8A" />
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-5 pt-3">
            <View className="flex-row items-center rounded-lg border border-hairline bg-white px-3 py-2.5">
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                className="ml-2 flex-1 text-sm text-dark"
                placeholderTextColor="#929292"
                placeholder="Rechercher un document…"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setEntityFilter('')}
                  className={`rounded-full px-3 py-2 ${entityFilter === '' ? 'bg-primary' : 'bg-white border border-hairline'}`}
                >
                  <Text className={`text-xs font-semibold ${entityFilter === '' ? 'text-white' : 'text-dark'}`}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {ENTITY_TYPES.map((e) => (
                  <TouchableOpacity
                    key={e.value}
                    onPress={() => setEntityFilter(e.value)}
                    className={`rounded-full px-3 py-2 ${entityFilter === e.value ? 'bg-primary' : 'bg-white border border-hairline'}`}
                  >
                    <Text className={`text-xs font-semibold ${entityFilter === e.value ? 'text-white' : 'text-dark'}`}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F53E8A" />}
          >
            {docs.length === 0 ? (
              <ErpEmptyState
                icon="document-text"
                title="Aucun document"
                subtitle="Téléversez une pièce jointe depuis votre téléphone."
                actionLabel="Ajouter un document"
                onAction={openSheet}
              />
            ) : (
              <View className="gap-2.5">
                {docs.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => openDoc(d.file_url)}
                    className="flex-row items-center rounded-xl border border-hairline bg-white p-3.5"
                    activeOpacity={0.8}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Ionicons name={DOC_TYPE_ICONS[d.document_type ?? ''] ?? 'document-text'} size={18} color="#64748B" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-dark" numberOfLines={1}>
                        {d.file_name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-grayText" numberOfLines={1}>
                        {[d.document_type, (d.entity_type ?? '').replace('_', ' ')].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            onPress={openSheet}
            className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-pill"
            activeOpacity={0.8}
            accessibilityLabel="Ajouter un document"
          >
            <Ionicons name="add" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      <ErpBottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Nouveau document">
        <Text className="mb-1.5 text-sm font-medium text-dark">Rattaché à *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {ENTITY_TYPES.map((e) => {
              const active = entityType === e.value;
              return (
                <TouchableOpacity
                  key={e.value}
                  onPress={() => pickEntityType(e.value)}
                  className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-white border border-hairline'}`}
                >
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>{e.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View className="mb-4">
          {loadingEntities ? (
            <ActivityIndicator size="small" color="#F53E8A" />
          ) : (
            <View className="gap-1.5">
              {entityOptions.slice(0, 10).map((o) => {
                const active = entityId === o.id;
                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => setEntityId(o.id)}
                    className={`rounded-lg border px-3 py-2.5 ${active ? 'border-primary bg-primary-50' : 'border-hairline bg-white'}`}
                  >
                    <Text className={`text-sm font-semibold ${active ? 'text-primary' : 'text-dark'}`} numberOfLines={1}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {entityOptions.length === 0 && (
                <Text className="text-sm text-grayText">Aucun élément de ce type.</Text>
              )}
            </View>
          )}
        </View>
        <Text className="mb-1.5 text-sm font-medium text-dark">Type de pièce</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {DOC_TYPES.map((t) => {
            const active = docType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => setDocType(t.value)}
                className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-white border border-hairline'}`}
              >
                <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-dark'}`}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text className="mb-1.5 text-sm font-medium text-dark">Fichier *</Text>
        <TouchableOpacity
          onPress={chooseFile}
          className="mb-5 flex-row items-center rounded-lg border border-dashed border-hairline bg-white px-4 py-3.5"
          activeOpacity={0.8}
        >
          <Ionicons name={file ? 'checkmark-circle' : 'cloud-upload'} size={18} color={file ? '#059669' : '#9CA3AF'} />
          <Text className="ml-2 flex-1 text-sm font-medium text-dark" numberOfLines={1}>
            {file ? file.name : 'Photo, galerie ou fichier…'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleUpload}
          disabled={saving || uploading}
          className="flex-row items-center justify-center rounded-lg bg-primary py-4"
          activeOpacity={0.8}
        >
          {saving || uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="cloud-upload" size={18} color="#ffffff" />
          )}
          <Text className="ml-2 text-sm font-semibold text-white">
            {uploading ? 'Téléversement…' : 'Téléverser'}
          </Text>
        </TouchableOpacity>
      </ErpBottomSheet>
    </SafeAreaView>
  );
}
