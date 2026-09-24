import { erpRpc } from '@/lib/erp/client';
import { DOCUMENT_META, type DocumentType } from '@/lib/erp/constants';

/**
 * Sequential document number (`FAC-2026-00001`, …) via the atomic
 * `ab_erp.ab_erp_next_doc_number` RPC (race-safe). Requires the SQL in
 * `web app/edit-erp-rpcs.sql`. Returns null when unavailable — callers
 * should surface a friendly error instead of guessing a number.
 */
export async function nextDocNumber(type: DocumentType): Promise<string | null> {
  if (!DOCUMENT_META[type]) return null;
  const res = await erpRpc<string>('ab_erp_next_doc_number', { p_doc_type: type });
  if (res.ok && typeof res.data === 'string' && res.data.length > 0) return res.data;
  console.error('nextDocNumber failed', type, res.message);
  return null;
}
