import MapView, { Marker, type Region } from 'react-native-maps';

export interface DoctorMapPin {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

const MOROCCO_REGION: Region = {
  latitude: 31.7917,
  longitude: -7.0926,
  latitudeDelta: 9,
  longitudeDelta: 9,
};

function regionForPins(pins: DoctorMapPin[]): Region {
  const valid = pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return MOROCCO_REGION;
  if (valid.length === 1) {
    return { latitude: valid[0].lat, longitude: valid[0].lng, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.6),
  };
}

/**
 * Read-only map with pins. Remount (via `key`) when the pin set changes,
 * since `initialRegion` only applies at mount.
 */
export function DoctorMap({ pins, height = 240 }: { pins: DoctorMapPin[]; height?: number }) {
  return (
    <MapView
      style={{ height, borderRadius: 20, overflow: 'hidden' }}
      initialRegion={regionForPins(pins)}
      accessibilityLabel="Carte des lieux"
    >
      {pins
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p, i) => (
          <Marker
            key={`${p.lat},${p.lng},${i}`}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            description={p.description}
            pinColor="#F53E8A"
          />
        ))}
    </MapView>
  );
}
