import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getProviderId } from '@/lib/services/provider-service';
import { getProviderReviews, computeReviewStats, ProReview } from '@/lib/services/reviews-service';

export default function ReviewsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<ProReview[]>([]);

  const load = useCallback(async (spinner = false) => {
    if (!user?.id) return;
    if (spinner) setLoading(true);
    try {
      const pid = await getProviderId(user.id);
      if (pid) setReviews(await getProviderReviews(pid));
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos avis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(true); }, [load]);

  const stats = computeReviewStats(reviews);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-pageBg" edges={['top']}>
        <ActivityIndicator size="large" color="#F53E8A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-pageBg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 124 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View className="px-5 pt-4">
          <Text className="text-2xl font-semibold text-dark">Avis patients</Text>
          <Text className="mt-1 text-sm font-medium text-grayText">{stats.total} avis · moyenne {stats.average.toFixed(1)}/5</Text>
        </View>

        <View className="mx-5 mt-5 rounded-panel border-hairline bg-white p-5 shadow-panel">
          <View className="flex-row items-center">
            <Text className="text-4xl font-bold text-dark">{stats.average.toFixed(1)}</Text>
            <View className="ml-4 flex-1 gap-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const pct = stats.total ? Math.round(((stats.distribution[star] ?? 0) / stats.total) * 100) : 0;
                return (
                  <View key={star} className="flex-row items-center gap-2">
                    <Text className="w-3 text-xs font-medium text-grayText">{star}</Text>
                    <View className="h-2 flex-1 overflow-hidden rounded-full bg-softCloud">
                      <View className="h-2 rounded-full bg-warning" style={{ width: `${pct}%` }} />
                    </View>
                    <Text className="w-8 text-right text-[11px] text-grayText">{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View className="mt-5 gap-3 px-5">
          {reviews.length === 0 ? (
            <View className="items-center rounded-panel border border-hairline bg-white p-8">
              <Ionicons name="star-outline" size={36} color="#929292" />
              <Text className="mt-4 text-base font-semibold text-dark">Aucun avis pour le moment</Text>
            </View>
          ) : reviews.map((r) => (
            <View key={r.id} className="rounded-panel border-hairline bg-white p-4 shadow-panel">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-dark">{r.patientName}</Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text className="text-xs font-semibold text-dark">{r.rating}/5</Text>
                </View>
              </View>
              {r.comment ? <Text className="mt-2 text-sm leading-5 text-dark">{r.comment}</Text> : null}
              <Text className="mt-2 text-[11px] text-grayText">
                {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
