import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useOnboardingStore } from '@/lib/onboarding/onboarding-store';

type DocKey = 'licenseDocument' | 'nationalIdDocument' | 'professionalOrderDocument';

interface DocOption {
  key: DocKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DOC_OPTIONS: DocOption[] = [
  {
    key: 'licenseDocument',
    label: 'Licence professionnelle',
    description: 'Document attestant de votre qualification',
    icon: 'document-text',
  },
  {
    key: 'nationalIdDocument',
    label: "Pièce d'identité nationale",
    description: 'Carte nationale d\'identité',
    icon: 'card',
  },
  {
    key: 'professionalOrderDocument',
    label: 'Inscription à l\'ordre',
    description: "Attestation d'inscription à l'ordre professionnel",
    icon: 'shield-checkmark',
  },
];

/**
 * Step 5 — Verification documents and terms.
 * Users upload three required documents (license, ID, professional order
 * membership) and check the terms checkbox before final submission.
 */
export function StepVerification() {
  const { verificationDocs, setVerificationDocs, agreedToTerms, setAgreedToTerms } =
    useOnboardingStore();
  const [uploadingDoc, setUploadingDoc] = useState<DocKey | null>(null);

  const pickDocument = async (key: DocKey) => {
    try {
      setUploadingDoc(key);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setVerificationDocs({
          [key]: {
            uri: asset.uri,
            name: asset.name,
            size: asset.size ?? 0,
          },
        });
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible de sélectionner le document.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const getFileName = (key: DocKey): string => {
    const doc = verificationDocs[key];
    return doc ? doc.name : 'Aucun fichier';
  };

  const hasDoc = (key: DocKey): boolean => !!verificationDocs[key];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        <Text className="text-center text-lg font-semibold tracking-[-0.3px] text-dark">
          Documents de vérification
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-grayText">
          Téléchargez les documents requis pour vérifier votre compte.
        </Text>

        <View className="mt-6 gap-4">
          {DOC_OPTIONS.map((doc) => {
            const uploaded = hasDoc(doc.key);
            const isUploading = uploadingDoc === doc.key;

            return (
              <Pressable
                key={doc.key}
                onPress={() => pickDocument(doc.key)}
                disabled={isUploading}
                className={`flex-row items-center gap-4 rounded-listing border bg-white p-4 shadow-panel ${
                  uploaded ? 'border-primary' : 'border-hairline'
                }`}
                style={({ pressed }) => pressed && !isUploading && { opacity: 0.85 }}
              >
                <View
                  className={`h-12 w-12 items-center justify-center rounded-full ${
                    uploaded ? 'bg-success-50' : 'bg-softCloud'
                  }`}
                >
                  {isUploading ? (
                    <Ionicons name="hourglass" size={24} color="#F53E8A" />
                  ) : (
                    <Ionicons
                      name={uploaded ? 'checkmark-circle' : doc.icon}
                      size={24}
                      color={uploaded ? '#10B981' : '#6a6a6a'}
                    />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-sm font-medium text-dark">
                    {doc.label}
                  </Text>
                  <Text className="text-xs text-grayText">
                    {uploaded ? getFileName(doc.key) : doc.description}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#929292"
                />
              </Pressable>
            );
          })}
        </View>

        {/* Terms */}
        <View className="mt-8 flex-row items-start gap-2">
          <Pressable
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            className="mt-0.5"
          >
            <Ionicons
              name={agreedToTerms ? 'checkbox' : 'square-outline'}
              size={20}
              color={agreedToTerms ? '#F53E8A' : '#929292'}
            />
          </Pressable>
          <Text className="flex-1 text-sm font-medium text-grayText">
            J'accepte les{' '}
            <Text className="font-semibold text-dark">
              conditions d'utilisation
            </Text>{' '}
            et la{' '}
            <Text className="font-semibold text-dark">
              politique de confidentialité
            </Text>
            .
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}