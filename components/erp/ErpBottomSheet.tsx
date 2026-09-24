import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Bottom-sheet modal for ERP CRUD forms. Slides up, closes on backdrop tap,
 * content scrolls (forms stay reachable on small screens / with keyboard).
 */
export function ErpBottomSheet({ visible, onClose, title, subtitle, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
        <View className="rounded-t-3xl bg-white">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-center justify-between border-b border-hairline px-5 pb-3 pt-4">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-dark">{title}</Text>
                {subtitle ? <Text className="mt-0.5 text-xs text-grayText">{subtitle}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="h-9 w-9 items-center justify-center rounded-full bg-softCloud"
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={18} color="#3D4B64" />
              </TouchableOpacity>
            </View>
            <ScrollView
              className="max-h-[75%]"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
