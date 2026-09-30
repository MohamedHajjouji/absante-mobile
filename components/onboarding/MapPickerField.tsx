import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export interface MapLatLng {
  lat: number;
  lng: number;
}

interface MapPickerFieldProps {
  /** City to show (map glides there when it changes). */
  center: MapLatLng | null;
  /** Currently picked point. */
  value: MapLatLng | null;
  onChange: (v: MapLatLng) => void;
  height?: number;
}

/**
 * Interactive picker: tap (or drag the pin) to place the cabinet.
 * The pin is optional — onboarding never blocks on it.
 */
export function MapPickerField({ center, value, onChange, height = 260 }: MapPickerFieldProps) {
  const ref = useRef<MapView>(null);
  const lastCenter = useRef<string | null>(null);

  const start = value ?? center;

  useEffect(() => {
    if (!center) return;
    const key = `${center.lat},${center.lng}`;
    if (lastCenter.current === key) return;
    lastCenter.current = key;
    ref.current?.animateToRegion(
      { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.09, longitudeDelta: 0.09 },
      500
    );
  }, [center]);

  return (
    <View>
      <MapView
        ref={ref}
        style={{ height, borderRadius: 14, overflow: 'hidden' }}
        initialRegion={
          start
            ? { latitude: start.lat, longitude: start.lng, latitudeDelta: 0.09, longitudeDelta: 0.09 }
            : { latitude: 31.7917, longitude: -7.0926, latitudeDelta: 9, longitudeDelta: 9 }
        }
        onPress={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
        accessibilityLabel="Carte — touchez pour placer votre cabinet"
      >
        {value && (
          <Marker
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            draggable
            onDragEnd={(e) =>
              onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })
            }
            pinColor="#F53E8A"
          />
        )}
      </MapView>
      <Text className="mt-1.5 text-xs text-grayText">
        Touchez la carte pour placer votre cabinet — vous pouvez déplacer le repère ensuite.
      </Text>
    </View>
  );
}
