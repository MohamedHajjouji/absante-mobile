import Mapbox from '@rnmapbox/maps';

/**
 * Mapbox access token plumbing (replaces Google Maps, which needs a
 * billing-backed API key). The user provides `EXPO_PUBLIC_MAPBOX_TOKEN`
 * locally in `.env` and as an EAS secret for builds — it is never committed.
 *
 * Call `ensureMapboxToken()` before any `<Mapbox.MapView>` mounts (both map
 * components do this). Telemetry is disabled: a health app should not phone
 * home usage data by default.
 */
let tokenSet = false;

export function ensureMapboxToken(): void {
  if (tokenSet) return;
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) return;
  Mapbox.setAccessToken(token);
  Mapbox.setTelemetryEnabled(false);
  tokenSet = true;
}

/** False when no token is configured — screens render an honest fallback. */
export function isMapboxConfigured(): boolean {
  return tokenSet || Boolean(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);
}
