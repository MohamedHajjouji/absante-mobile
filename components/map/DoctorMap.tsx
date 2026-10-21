import { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { ensureMapboxToken, isMapboxConfigured } from '@/lib/mapbox';

export interface DoctorMapPin {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

/** Morocco overview ([lng, lat] — Mapbox uses GeoJSON order). */
const MOROCCO_CENTER: [number, number] = [-7.0926, 31.7917];

function viewForPins(pins: DoctorMapPin[]): { center: [number, number]; zoom: number } {
  const valid = pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length === 0) return { center: MOROCCO_CENTER, zoom: 5 };
  if (valid.length === 1) return { center: [valid[0].lng, valid[0].lat], zoom: 14 };
  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  const zoom = span > 4 ? 5 : span > 1 ? 7 : span > 0.3 ? 10 : span > 0.08 ? 12 : 14;
  return { center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2], zoom };
}

const PIN_DOT = {
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '#F53E8A',
  borderWidth: 3,
  borderColor: '#FFFFFF',
} as const;

function MapPin({ pin, index }: { pin: DoctorMapPin; index: number }) {
  const id = `pin-${pin.lat}-${pin.lng}-${index}`;
  const dot = <View style={PIN_DOT} />;
  // PointAnnotation's children type forbids null, so branch explicitly.
  if (pin.title) {
    return (
      <Mapbox.PointAnnotation id={id} coordinate={[pin.lng, pin.lat]}>
        {dot}
        <Mapbox.Callout title={pin.title} />
      </Mapbox.PointAnnotation>
    );
  }
  return (
    <Mapbox.PointAnnotation id={id} coordinate={[pin.lng, pin.lat]}>
      {dot}
    </Mapbox.PointAnnotation>
  );
}

/**
 * Read-only map with pins (callers unchanged). Three placements:
 * - default: interactive map in a fixed-height box (use inside MapModal)
 * - preview: static thumbnail — all map gestures disabled so the surrounding
 *   ScrollView keeps handling touches; tap calls onOpen (opens the modal)
 * - full: flex-1 frame for MapModal children
 */
export function DoctorMap({
  pins,
  height = 240,
  preview = false,
  full = false,
  onOpen,
}: {
  pins: DoctorMapPin[];
  height?: number;
  preview?: boolean;
  full?: boolean;
  onOpen?: () => void;
}) {
  ensureMapboxToken();
  const valid = useMemo(
    () => pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [pins]
  );
  const view = useMemo(() => viewForPins(valid), [valid]);

  if (!isMapboxConfigured()) {
    return (
      <View
        className="items-center justify-center rounded-panel border border-hairline bg-white px-6"
        style={{ height: full ? undefined : height, flex: full ? 1 : undefined }}
        accessibilityLabel="Carte indisponible"
      >
        <Ionicons name="map-outline" size={32} color="#929292" />
        <Text className="mt-2 text-center text-sm text-grayText">
          Carte indisponible pour le moment
        </Text>
      </View>
    );
  }

  const map = (
    <Mapbox.MapView
      style={{ flex: 1 }}
      accessibilityLabel="Carte des lieux"
      scrollEnabled={!preview}
      zoomEnabled={!preview}
      rotateEnabled={!preview}
      pitchEnabled={!preview}
    >
      <Mapbox.Camera centerCoordinate={view.center} zoomLevel={view.zoom} />
      {valid.map((p, i) => (
        <MapPin key={`${p.lat},${p.lng},${i}`} pin={p} index={i} />
      ))}
    </Mapbox.MapView>
  );

  if (preview) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Agrandir la carte"
        style={{ height, borderRadius: 20, overflow: 'hidden' }}
      >
        {map}
        <View
          pointerEvents="none"
          className="absolute bottom-2.5 right-2.5 h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft"
        >
          <Ionicons name="expand" size={16} color="#3D4B64" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={full ? { flex: 1 } : { height, borderRadius: 20, overflow: 'hidden' }}
    >
      {map}
    </View>
  );
}
