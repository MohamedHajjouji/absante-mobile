import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { FormInput } from '@/components/ui/FormInput';
import { useOnboardingStore, PersonalInfo } from '@/lib/onboarding/onboarding-store';
import { uploadAvatar } from '@/lib/services/user-service';
import { useAuth } from '@/lib/contexts/AuthContext';

const LANGUAGES = [
  'Français', 'Arabe', 'Anglais', 'Espagnol',
  'Allemand', 'Italien', 'Portugais', 'Turc',
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Homme', icon: 'male' },
  { value: 'female', label: 'Femme', icon: 'female' },
] as const;

/**
 * Step 2 — Personal information.
 * Includes avatar upload, name, contact details, gender, languages,
 * biography, experience, and license number.
 */
export function StepPersonalInfo() {
  const { user } = useAuth();
  const { personalInfo, setPersonalInfo } = useOnboardingStore();
  const [uploading, setUploading] = useState(false);

  const handleAvatarPress = async () => {
    if (!user?.id) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', "L'accès à la galerie est requis.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploading(true);
      const url = await uploadAvatar(uri, user.id);
      setUploading(false);

      if (url) {
        setPersonalInfo({ avatarUrl: url });
      } else {
        Alert.alert('Erreur', "Échec du téléchargement de l'avatar.");
      }
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = personalInfo.languages;
    const updated = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    setPersonalInfo({ languages: updated });
  };

  const updateField = (field: keyof PersonalInfo, value: any) => {
    setPersonalInfo({ [field]: value } as Partial<PersonalInfo>);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        {/* Avatar */}
        <View className="items-center">
          <Pressable
            onPress={handleAvatarPress}
            disabled={uploading}
            className="relative h-24 w-24 items-center justify-center rounded-full bg-primary-100"
          >
            {personalInfo.avatarUrl ? (
              <Ionicons name="image" size={40} color="#F53E8A" />
            ) : (
              <Ionicons name="camera" size={32} color="#F53E8A" />
            )}
            {uploading && (
              <View className="absolute bottom-1 right-1 rounded-full bg-primary p-1">
                <Ionicons name="hourglass" size={14} color="#ffffff" />
              </View>
            )}
          </Pressable>
          <Text className="mt-2 text-xs text-grayText">
            Appuyez pour ajouter votre photo
          </Text>
        </View>

        {/* Name fields */}
        <FormInput
          label="Prénom"
          placeholder="Jean"
          iconName="person"
          value={personalInfo.firstName}
          onChangeText={(v) => updateField('firstName', v)}
          autoCapitalize="words"
        />
        <FormInput
          label="Nom"
          placeholder="Dupont"
          iconName="person"
          value={personalInfo.lastName}
          onChangeText={(v) => updateField('lastName', v)}
          autoCapitalize="words"
        />

        {/* Contact */}
        <FormInput
          label="Téléphone"
          placeholder="+212 6 12 34 56 78"
          iconName="call"
          value={personalInfo.phone}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
        />
        <FormInput
          label="WhatsApp"
          placeholder="+212 6 12 34 56 78"
          iconName="logo-whatsapp"
          value={personalInfo.whatsapp}
          onChangeText={(v) => updateField('whatsapp', v)}
          keyboardType="phone-pad"
        />

        {/* Gender */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-dark">Genre</Text>
          <View className="flex-row gap-4">
            {GENDER_OPTIONS.map((g) => (
              <Pressable
                key={g.value}
                onPress={() => updateField('gender', g.value)}
                className={`flex-row items-center gap-2 rounded-lg border px-4 py-3 ${
                  personalInfo.gender === g.value
                    ? 'border-primary bg-primary-50'
                    : 'border-hairline bg-white'
                }`}
              >
                <Ionicons
                  name={g.icon}
                  size={20}
                  color={personalInfo.gender === g.value ? '#F53E8A' : '#6a6a6a'}
                />
                <Text
                  className={`text-sm font-medium ${
                    personalInfo.gender === g.value ? 'text-primary' : 'text-grayText'
                  }`}
                >
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Languages */}
        <View className="mb-4">
          <Text className="mb-1.5 text-sm font-medium text-dark">
            Langues parlées
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LANGUAGES.map((lang) => {
              const selected = personalInfo.languages.includes(lang);
              return (
                <Pressable
                  key={lang}
                  onPress={() => toggleLanguage(lang)}
                  className={`rounded-full px-3 py-1.5 ${
                    selected ? 'bg-primary' : 'bg-softCloud'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selected ? 'text-white' : 'text-grayText'
                    }`}
                  >
                    {lang}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Biography */}
        <FormInput
          label="Biographie"
          placeholder="Parlez-de vous..."
          iconName="document-text"
          value={personalInfo.biography}
          onChangeText={(v) => updateField('biography', v)}
          multiline
          numberOfLines={4}
        />

        {/* Experience & License */}
        <FormInput
          label="Années d'expérience"
          placeholder="5"
          iconName="time"
          value={personalInfo.yearsOfExperience.toString()}
          onChangeText={(v) => updateField('yearsOfExperience', parseInt(v) || 0)}
          keyboardType="numeric"
        />
        <FormInput
          label="Numéro de licence"
          placeholder="12345"
          iconName="document"
          value={personalInfo.licenseNumber}
          onChangeText={(v) => updateField('licenseNumber', v)}
          autoCapitalize="characters"
        />
      </View>
    </ScrollView>
  );
}
