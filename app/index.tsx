import { Redirect } from 'expo-router';

/**
 * Root entry point.
 *
 * There was previously no `app/index.tsx`, so opening the app resolved `/`
 * to `+not-found` (blank "Page introuvable" screen that looks like a crash).
 * Guests and patients land on the public tabs; role-based redirects inside
 * `(tabs)` / `(professional)` take over from there.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
