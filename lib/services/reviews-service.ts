import { supabase } from '@/lib/supabase';

export interface ProReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patientName: string;
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

/** Mirrors web getProviderReviews + getReviewStats. */
export async function getProviderReviews(providerId: string): Promise<ProReview[]> {
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, patient:patient_id(first_name, last_name)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!data) return [];
  return (data as any[]).map((r) => {
    const p = Array.isArray(r.patient) ? r.patient[0] : r.patient;
    return {
      id: r.id,
      rating: Number(r.rating ?? 0),
      comment: r.comment ?? null,
      createdAt: r.created_at,
      patientName: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient' : 'Patient',
    };
  });
}

export function computeReviewStats(reviews: ProReview[]): ReviewStats {
  const total = reviews.length;
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    if (distribution[r.rating] !== undefined) distribution[r.rating] += 1;
  }
  return { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, distribution };
}
