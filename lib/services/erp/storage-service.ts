/**
 * ERP file uploads — mobile edition.
 *
 * The web ERP only pastes file URLs (`receipt_url`, `file_url`); mobile goes
 * one step further with real on-device picking (camera / gallery / files)
 * uploaded to the `erp-documents` Supabase storage bucket.
 *
 * If the bucket does not exist (or RLS blocks the upload), callers get a
 * clear French message telling an admin to create it — nothing crashes.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export const ERP_BUCKET = 'erp-documents';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

export async function pickAnyFile(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.name ?? `document-${Date.now()}`,
    mimeType: a.mimeType ?? null,
    size: a.size ?? null,
  };
}

export async function pickImageFromLibrary(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Accès à la galerie refusé.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: a.mimeType ?? 'image/jpeg',
    size: a.fileSize ?? null,
  };
}

export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Accès à la caméra refusé.');
  const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: a.mimeType ?? 'image/jpeg',
    size: a.fileSize ?? null,
  };
}

/** Uploads a picked file, returns its public URL. */
export async function uploadErpFile(
  file: PickedFile,
  folder = 'divers'
): Promise<{ ok: boolean; url?: string; message?: string }> {
  try {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from(ERP_BUCKET)
      .upload(path, blob, {
        contentType: file.mimeType ?? undefined,
        upsert: false,
      });
    if (error) {
      if (/not found|bucket|404/i.test(error.message)) {
        return {
          ok: false,
          message: `Stockage « ${ERP_BUCKET} » introuvable : créez le bucket dans Supabase, puis réessayez.`,
        };
      }
      if (/row-level security|policy|42501|403/i.test(error.message)) {
        return {
          ok: false,
          message: 'Téléversement refusé par les règles de sécurité du stockage.',
        };
      }
      return { ok: false, message: error.message };
    }
    const { data } = supabase.storage.from(ERP_BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Téléversement impossible.' };
  }
}
