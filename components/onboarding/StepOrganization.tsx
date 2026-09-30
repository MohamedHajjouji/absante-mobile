import { View, Text, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { FormInput } from '@/components/ui/FormInput';
import { CityPicker, type MobileCity } from '@/components/onboarding/CityPicker';
import { MapPickerField } from '@/components/onboarding/MapPickerField';
import { useOnboardingStore } from '@/lib/onboarding/onboarding-store';

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Text className="text-sm font-medium text-dark">{label}</Text>
      <View
        className={`h-6 w-12 rounded-full ${value ? 'bg-primary' : 'bg-softCloud'}`}
      >
        <View
          className={`h-5 w-5 rounded-full bg-white shadow ${value ? 'ml-auto' : 'ml-1'}`}
        />
      </View>
    </Pressable>
  );
}

/**
 * Step 3 — Organization, address, and facility information.
 * Grouped into three visual sections within a single scroll view.
 */
export function StepOrganization() {
  const org = useOnboardingStore((s) => s.organizationInfo);
  const address = useOnboardingStore((s) => s.address);
  const facility = useOnboardingStore((s) => s.facility);
  const setOrganizationInfo = useOnboardingStore((s) => s.setOrganizationInfo);
  const setAddress = useOnboardingStore((s) => s.setAddress);
  const setFacility = useOnboardingStore((s) => s.setFacility);

  // City picked in the dropdown — the map opens centered on it.
  const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | null>(null);

  function handleCityPick(c: MobileCity) {
    // New city → old pin is stale, pick again on the map.
    setAddress({ city: c.name_fr, city_id: c.id, region: c.region, latitude: null, longitude: null });
    setCityCenter(
      c.latitude != null && c.longitude != null ? { lat: c.latitude, lng: c.longitude } : null
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5">
        {/* ── Organization ── */}
        <Text className="mb-3 text-sm font-semibold text-dark">
          Organisation
        </Text>
        <FormInput
          label="Nom de l'organisme"
          placeholder="..."
          iconName="business"
          value={org.name}
          onChangeText={(v) => setOrganizationInfo({ name: v })}
        />
        <FormInput
          label="Site web"
          placeholder="https://..."
          iconName="globe"
          value={org.website}
          onChangeText={(v) => setOrganizationInfo({ website: v })}
          keyboardType="url"
          autoCapitalize="none"
        />
        <FormInput
          label="Téléphone"
          placeholder="+212 ..."
          iconName="call"
          value={org.phone}
          onChangeText={(v) => setOrganizationInfo({ phone: v })}
          keyboardType="phone-pad"
        />
        <FormInput
          label="WhatsApp"
          placeholder="+212 ..."
          iconName="logo-whatsapp"
          value={org.whatsapp}
          onChangeText={(v) => setOrganizationInfo({ whatsapp: v })}
          keyboardType="phone-pad"
        />
        <FormInput
          label="Description"
          placeholder="..."
          iconName="document-text"
          value={org.description}
          onChangeText={(v) => setOrganizationInfo({ description: v })}
        />

        {/* ── Address ── */}
        <Text className="mb-3 mt-4 text-sm font-semibold text-dark">
          Adresse
        </Text>
        <CityPicker
          value={address.city}
          hasSelection={!!address.city_id}
          onPick={handleCityPick}
          onText={(t) =>
            setAddress(t.trim() === '' ? { city: '', city_id: '' } : { city: t, city_id: '' })
          }
        />
        {!!address.city_id && (
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-dark">
              Emplacement sur la carte <Text className="font-normal text-grayText">(optionnel)</Text>
            </Text>
            <MapPickerField
              center={cityCenter}
              value={
                address.latitude != null && address.longitude != null
                  ? { lat: address.latitude, lng: address.longitude }
                  : null
              }
              onChange={(v) => setAddress({ latitude: v.lat, longitude: v.lng })}
            />
          </View>
        )}
        <FormInput
          label="Rue / Adresse"
          placeholder="..."
          iconName="location"
          value={address.streetAddress}
          onChangeText={(v) => setAddress({ streetAddress: v })}
        />
        <FormInput
          label="Région"
          placeholder="..."
          iconName="map"
          value={address.region}
          onChangeText={(v) => setAddress({ region: v })}
        />
        <FormInput
          label="Code postal"
          placeholder="..."
          iconName="pricetag"
          value={address.postalCode}
          onChangeText={(v) => setAddress({ postalCode: v })}
          keyboardType="numeric"
        />

        {/* ── Facility ── */}
        <Text className="mb-3 mt-4 text-sm font-semibold text-dark">
          Établissement
        </Text>
        <FormInput
          label="Nom de l'établissement"
          placeholder="..."
          iconName="medical"
          value={facility.name}
          onChangeText={(v) => setFacility({ name: v })}
        />
        <FormInput
          label="Téléphone"
          placeholder="..."
          iconName="call"
          value={facility.phone}
          onChangeText={(v) => setFacility({ phone: v })}
          keyboardType="phone-pad"
        />

        <Toggle
          label="Parking disponible"
          value={facility.parkingAvailable}
          onChange={(v) => setFacility({ parkingAvailable: v })}
        />
        <Toggle
          label="Accessible aux fauteuils roulants"
          value={facility.wheelchairAccessible}
          onChange={(v) => setFacility({ wheelchairAccessible: v })}
        />
        <Toggle
          label="Services d'urgence"
          value={facility.emergencyServices}
          onChange={(v) => setFacility({ emergencyServices: v })}
        />
      </View>
    </ScrollView>
  );
}
