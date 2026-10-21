import { useEffect } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

/**
 * Full-screen map container. Rendered as an absolute overlay (not a native
 * Modal) because native map views render reliably inside plain views, but
 * Android back is still handled manually so the overlay never traps the user.
 *
 * Children must be flexible-height (maps use flex-1, no fixed height).
 */
export function MapModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} className="bg-white">
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-hairline px-2 py-2.5">
          <View className="h-11 w-11" />
          <Text className="flex-1 text-center text-base font-semibold text-dark" numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="mx-1 h-11 w-11 items-center justify-center rounded-full bg-softCloud"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Fermer la carte"
          >
            <Ionicons name="close" size={22} color="#3D4B64" />
          </TouchableOpacity>
        </View>
        {/* Map area — not inside a ScrollView, so pan/pinch gestures reach the map */}
        <View className="flex-1">{children}</View>
      </SafeAreaView>
    </View>
  );
}
