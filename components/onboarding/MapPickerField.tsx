import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { ensureMapboxToken, isMapboxConfigured } from '@/lib/mapbox';
import { MapModal } from '@/components/map/MapModal';

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
  /** Height of the inline preview card. */
  height?: number;
}

/**
 * Accepts a Mapbox press/drag payload ([lng, lat] GeoJSON) or a
 * {latitude, longitude} object. Never throws — bad payloads are ignored.
 */
function toLatLng(coord: unknown): MapLatLng | null {
  if (Array.isArray(coord) && coord.length >= 2) {
    const [lng, lat] = coord;
    if (Number.isFinite(lng) && Number.isFinite(lat)) return { lat, lng };
    return null;
  }
  if (coord && typeof coord === 'object') {
    const o = coord as { latitude?: unknown; longitude?: unknown };
    if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
      return { lat: o.latitude as number, lng: o.longitude as number };
    }
  }
  return null;
}

/**
 * Location picker, modal-first: the inline field is a static preview
 * (map gestures disabled so the onboarding ScrollView keeps handling
 * touches) that opens a full-screen picker, where tap/drag pan works
 * normally. The pin is optional — onboarding never blocks on it.
 */
export function MapPickerField({ center, value, onChange, height = 180 }: MapPickerFieldProps) {
  ensureMapboxToken();
  const [open, setOpen] = useState(false);
  // Force a fresh map (camera at current start) each time the picker opens.
  const [modalKey, setModalKey] = useState(0);
  // Preview camera glides when the chosen city changes.
  const previewCameraRef = useRef<React.ElementRef<typeof Mapbox.Camera> | null>(null);

  const openPicker = () => {
    setModalKey((k) => k + 1);
    setOpen(true);
  };

  useEffect(() => {
    if (!center) return;
    previewCameraRef.current?.moveTo([center.lng, center.lat], 500);
  }, [center]);

  const configured = isMapboxConfigured();
  const start = value ?? center;

  return (
    <View>
      {/* Static preview / placeholder */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel="Choisir l'emplacement sur la carte"
        style={{ height, borderRadius: 14, overflow: 'hidden' }}
      >
        {configured ? (
          <View style={{ flex: 1 }}>
            <Mapbox.MapView
              style={{ flex: 1 }}
              accessibilityLabel="Aperçu de l'emplacement"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Mapbox.Camera
                ref={previewCameraRef}
                centerCoordinate={start ? [start.lng, start.lat] : [-7.0926, 31.7917]}
                zoomLevel={start ? 14 : 5}
              />
              {value && (
                <Mapbox.PointAnnotation id="picked-preview" coordinate={[value.lng, value.lat]}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: '#F53E8A',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                    }}
                  />
                </Mapbox.PointAnnotation>
              )}
            </Mapbox.MapView>
            <View
              pointerEvents="none"
              className="absolute bottom-2.5 right-2.5 h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft"
            >
              <Ionicons name="expand" size={16} color="#3D4B64" />
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center border border-hairline bg-white px-6">
            <Ionicons name="map-outline" size={32} color="#929292" />
            <Text className="mt-2 text-center text-sm text-grayText">
              Carte indisponible — indiquez votre adresse dans les champs ci-dessous.
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Text className="mt-1.5 text-xs text-grayText">
        Touchez pour placer votre cabinet sur la carte — vous pouvez déplacer le repère ensuite.
      </Text>

      {/* Full-screen interactive picker */}
      <MapModal
        visible={open}
        title="Emplacement du cabinet"
        onClose={() => setOpen(false)}
      >
        {configured ? (
          <View style={{ flex: 1 }}>
            <FullScreenPicker center={center} value={value} onChange={onChange} mapKey={modalKey} />
            <TouchableOpacity
              onPress={() => setOpen(false)}
              activeOpacity={0.85}
              className="absolute bottom-6 self-center rounded-full bg-primary px-8 py-3 shadow-panel"
              accessibilityRole="button"
              accessibilityLabel="Terminer le placement"
            >
              <Text className="text-sm font-semibold text-white">Terminé</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </MapModal>
    </View>
  );
}

/**
 * The interactive (pan/zoom/tap/drag) map. Lives inside the modal, outside
 * any ScrollView, so gestures reach it. Camera re-centers when the chosen
 * city changes.
 */
function FullScreenPicker({
  center,
  value,
  onChange,
  mapKey,
}: {
  center: MapLatLng | null;
  value: MapLatLng | null;
  onChange: (v: MapLatLng) => void;
  mapKey: number;
}) {
  const cameraRef = useRef<React.ElementRef<typeof Mapbox.Camera> | null>(null);
  const lastCenter = useRef<string | null>(null);

  const start = value ?? center;

  useEffect(() => {
    if (!center) return;
    const key = `${center.lat},${center.lng}`;
    if (lastCenter.current === key) return;
    lastCenter.current = key;
    cameraRef.current?.moveTo([center.lng, center.lat], 500);
  }, [center]);

  return (
    <Mapbox.MapView
      key={`picker-${mapKey}`}
      style={{ flex: 1 }}
      accessibilityLabel="Carte — touchez pour placer votre cabinet"
      onPress={(e: any) => {
        const p = toLatLng(e?.geometry?.coordinates);
        if (p) onChange(p);
      }}
    >
      <Mapbox.Camera
        ref={cameraRef}
        centerCoordinate={start ? [start.lng, start.lat] : [-7.0926, 31.7917]}
        zoomLevel={start ? 14 : 5}
      />
      {value && (
        <Mapbox.PointAnnotation
          id="picked-cabinet"
          coordinate={[value.lng, value.lat]}
          draggable
          onDragEnd={(feature: any) => {
            const p = toLatLng(feature?.geometry?.coordinates);
            if (p) onChange(p);
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#F53E8A',
              borderWidth: 3,
              borderColor: '#FFFFFF',
            }}
          />
        </Mapbox.PointAnnotation>
      )}
    </Mapbox.MapView>
  );
}
