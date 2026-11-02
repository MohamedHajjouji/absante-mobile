# AB Santé — Mobile app → installable PWA (app.absante.ma)

> **Goal:** ship the Expo app as an installable Progressive Web App at
> `app.absante.ma` (Vercel, second project) **without changing anything the
> native iOS/Android builds depend on.**
>
> **Decisions (confirmed):** Vercel 2nd project · `app.absante.ma` ·
> Mapbox GL JS for the web maps.
>
> Expo SDK 57 — versioned docs: <https://docs.expo.dev/versions/v57.0.0/>
> (PWA guide: <https://docs.expo.dev/guides/progressive-web-apps/>)

---

## 0. Native-safety contract (applies to every phase)

1. **No dependency upgrades.** Only additions: `@expo/metro-runtime` (web
   runtime), `mapbox-gl` (web map). Neither is imported by native code paths.
2. **Platform files only, never edits to native files.** Web behavior lives in
   `*.web.tsx` variants — Metro resolves them for web builds only; iOS/Android
   bundles keep resolving the existing `*.tsx` files byte-for-byte.
3. **`app.json` changes are confined to the `web` block + `favicon`.** The
   `ios`, `android` and `plugins` sections stay untouched.
4. **Verification gates after every phase** (see §7): `typecheck` →
   `expo export -p web` → `expo export -p android -p ios` (native JS bundle
   regression net that needs no device).

## 1. Current state (audited 2026-10-31)

**Already web-ready — no work needed:**
- `lib/supabase.ts` — explicit `Platform.OS === 'web'` branch (localStorage +
  memory fallback), written with static-rendering in mind.
- `react-dom` + `react-native-web` already in dependencies.
- NativeWind v4, Reanimated 4, Gesture Handler, SafeArea, Screens, Zustand —
  all support web.
- `expo-image-picker` / `expo-document-picker` — built-in web support.
- `app.json` already has `web.bundler: "metro"`.

**Blockers & gaps found:**
| # | Issue | Where |
|---|-------|-------|
| 1 | `@expo/metro-runtime` missing (required for web) | `package.json` |
| 2 | `@rnmapbox/maps` is native-only — breaks the web bundle | `components/map/DoctorMap.tsx`, `components/onboarding/MapPickerField.tsx`, `lib/mapbox.ts` |
| 3 | No `public/` dir, no manifest, no icons, no HTML template | repo root |
| 4 | `web.output` = `"static"` — see §3.1, switch to `"single"` | `app.json` |
| 5 | OAuth redirect URL builder has no web branch | `lib/services/auth-service.ts` (`getRedirectUrl`) |
| 6 | Supabase Auth allowlist doesn't include the new domain | Supabase dashboard |
| 7 | No service worker / offline shell | new |

**Web-behavior deltas to QA (modules support web, behavior differs):**
`@react-native-community/datetimepicker` (agenda), `expo-print` +
`expo-sharing` (invoice/affiches PDF — `navigator.share` missing on desktop),
Google OAuth popup (must fire from a user gesture, popup blockers), iOS
input-zoom on forms (keep ≥16px fonts), body scrolling on mobile Safari.

## 2. Architecture

```
GitHub repo (absante-mobile)          ← unchanged, single source of truth
 ├─ native: EAS builds (iOS/Android)  ← untouched
 └─ web:    Vercel project #2         ← new
              build:  npm run build:web  (expo export -p web + Workbox)
              output: dist/
              URL:    https://app.absante.ma
```

- **Separate subdomain is mandatory**: a service worker scoped at
  `absante.ma` would take over caching of the Next.js site. `app.absante.ma`
  keeps the two apps fully isolated (cache, middleware, CDN, deploys).
- Both apps still share one Supabase backend — the same env vars, just
  configured in a second place.

## 3. Implementation phases

### Phase 1 — Make the web bundle compile (the only real engineering) ✅ DONE 2026-11-01
- `npx expo install @expo/metro-runtime` ✓ (SDK-aligned).
- `mapbox-gl@^2.15.0` added to **dependencies** (v2, not v3: `@rnmapbox/maps`
  declares `peerOptional mapbox-gl@^2.9.0` — v3 makes `npm ls` report
  `invalid`; v2.15.0 keeps the tree clean and satisfies rnmapbox's web layer).
  No `@types/mapbox-gl` needed — tsc resolves `@rnmapbox/maps` to its native
  type entry (`index.native.d.ts`), which never references mapbox-gl types.
- **Strategy revised during implementation (discovery):** `@rnmapbox/maps@10.3.7`
  ships an **official web backend** (`lib/module/web/`, built on mapbox-gl JS),
  auto-selected per platform (`index.js` web vs `index.native.js` native).
  So the variants ride rnmapbox's own web stack instead of hand-rolled GL JS —
  zero native-file edits, same engine, same token.
- **`components/map/DoctorMap.web.tsx`** ✓ — same props contract as native;
  `PointAnnotation`/`Callout` are `UnimplementedComponent` on web → pins use
  `MarkerView`, callout is native-only. Preview uses `pointerEvents="none"`
  because the web `MapView` ignores `scrollEnabled`/`zoomEnabled`/….
- **`components/onboarding/MapPickerField.web.tsx`** ✓ — same contract; web
  `MarkerView` has no `draggable` → pin moves by tap (`MapView.onPress` emits
  the identical native Feature shape, so `toLatLng` works unchanged).
- Callers unchanged — Metro platform resolution picks `.web.tsx` for web only.
- **Gates (all 2026-11-01):**
  - `npx tsc --noEmit` → exit 0 ✓
  - `npx expo export -p web` → exit 0, 113 static routes, `mapbox-gl.css`
    present in output (proof the web backend was picked) ✓
  - `npx expo export -p android -p ios` → exit 0, native bundles intact
    (2105 / 2020 modules, no mapbox-gl in native assets) ✓
- Known web-only deltas (QA in Phase 6): no pin drag in the picker (tap to
  place), no callout bubble, map-gesture blocking via `pointerEvents`.

### Phase 2 — Auth on web ✅ DONE 2026-11-01 (code) — dashboard step pending
- `getRedirectUrl()` in `lib/services/auth-service.ts`: web branch →
  `Linking.createURL('callback')` → absolute `https://app.absante.ma/callback`
  (SDK 57 Linking docs guarantee origin-based URLs on web; `callback` is the
  real route — `app/(auth)/callback.tsx`, `(auth)` is a group). Native branch
  (`Linking.createURL('auth/callback')`) untouched.
- `signInWithGoogle()`:
  - `skipBrowserRedirect: Platform.OS === 'web'` — without it auth-js calls
    `window.location.assign()` itself (verified in `_handleProviderSignIn`),
    racing the popup. No-op on native (`isBrowser()` false there).
  - `ERR_WEB_BROWSER_BLOCKED` (SDK 57 docs: mobile browsers block
    `window.open()` after async work) → caught on web → falls back to a
    full-page `window.location.assign(data.url)`; `/callback` then completes
    the session via supabase-js `detectSessionInUrl` (implicit flow default).
  - Web-only: if `processOAuthCallback` didn't get the tokens (the popup may
    have consumed them itself — shared localStorage, and supabase-js has **no
    cross-tab storage events**), re-establish via `getSession()` →
    `setSession()` so AuthContext in the opener is notified.
- `app/(auth)/callback.tsx`: web-only `WebBrowser.maybeCompleteAuthSession()`
  at the top of the effect — the documented handshake ("invoked on the page
  the window redirects to") that posts the final URL to `openAuthSessionAsync`
  in the opener. Harmless `failed` result on direct visits (email/reset
  links). Platform-guarded → native path byte-for-byte identical.
- Verified against SDK 57 docs (`sdk/linking`, `sdk/webbrowser` — note the
  slug has no hyphen) + installed source of expo-web-browser / auth-js.
- **Manual dashboard step (user):** Supabase → Authentication → URL
  Configuration → add `https://app.absante.ma/**` to Redirect URLs (and
  `http://localhost:8081/callback` for local web dev).
- **Gates (2026-11-01):** `tsc` ✓ · `expo export -p web` ✓ ·
  `expo export -p android -p ios` ✓
- QA (Phase 6): Google OAuth popup on desktop **and** mobile browsers,
  `npx expo start --https` required for local OAuth (ERR_WEB_BROWSER_CRYPTO),
  email confirmation, password reset, session persistence across reloads.

### Phase 3 — PWA manifest & shell ✅ DONE 2026-11-01
- `app.json` (web block only, per contract): `web.output` → `"single"`,
  `web.favicon` → `"./assets/favicon.png"`.
- `public/index.html` created via `npx expo customize public/index.html`;
  head now links `/manifest.json`, `theme-color #FEFBFC` (verified against
  `app/_layout.tsx` contentStyle), and iOS home-screen metas
  (`apple-touch-icon` 180×180, `apple-mobile-web-app-capable`, title).
  SW registration script added in Phase 4.
- `public/manifest.json`: name/short_name "AB Santé", `display: standalone`,
  `orientation: portrait`, `start_url`/`scope`/`id` `/`, colors `#FEFBFC`,
  icons: auto-generated `/favicon.ico` + `logo192` + `logo512` (purpose any)
  + `logo512-maskable` (logo at 68% on brand background — Android mask safe
  zone) + `apple-touch-icon.png`. All generated from `assets/icon.png`
  (1024×1024) with high-quality resampling (PowerShell System.Drawing, no
  new deps).
- **Gates (2026-11-01):** `tsc` ✓ · `expo export -p web` ✓ → exactly **1**
  `index.html` (SPA) + all 7 PWA files in `dist/`, `favicon.ico` auto-made
  from `web.favicon` ✓ · `expo export -p android -p ios` ✓ with **identical
  bundle hashes to Phase 2** (native proven untouched by app.json/public
  changes) ✓
- Note: `output: single` means no per-route prerendered HTML — deep links
  rely on the SPA rewrite in `vercel.json` (Phase 5).

#### 3.1 Why `single` (SPA) instead of the configured `static`
- The app is authenticated — SEO/per-route HTML buys nothing; offline shell
  is simpler with one `index.html`.
- `static` prerenders every screen in Node at export time and needs
  `generateStaticParams` for the dynamic routes (`doctor/[id]`,
  `booking/[providerId]`) — extra work and a new class of export crashes for
  zero benefit here.
- `single` is also the SDK 57 default and the docs' Vercel config maps 1:1
  (SPA rewrite). Web-only key — native unaffected.

### Phase 4 — Service worker (Workbox) & offline ✅ DONE 2026-11-01
- `workbox-cli@^7.4.1` dev dep (addition only — package.json diff verified:
  exactly `@expo/metro-runtime`, `mapbox-gl`, `workbox-cli`, zero upgrades;
  the 10 new npm-audit warnings are inside workbox's dev tree, never
  bundled — still no `npm audit fix`).
- `workbox-config.js`: precache-only (js/html/css/ico/json/png/ttf/woff),
  `navigateFallback: "/index.html"`, `skipWaiting` + `clientsClaim` +
  `cleanupOutdatedCaches`, **no runtime caching rules** → Supabase never
  cached (health data always network).
- **Two silent-failure traps found & fixed (verified against workbox source):**
  1. Schema default `globIgnores: ["**/node_modules/**/*"]` excluded every
     exported font/image (expo puts them under `dist/assets/node_modules/…`)
     → `globIgnores: []` override.
  2. Default `maximumFileSizeToCacheInBytes` = 2 MB silently skipped the
     4.82 MB entry bundle → offline would be a blank page → set 10 MB.
  Result: **49 URLs / 9.42 MB** precached (entry + 19 fonts + 23 images),
  deterministic across clean rebuilds.
- `public/index.html`: SW registration script (Expo PWA guide snippet);
  in dev `/sw.js` 404s and the catch just logs — harmless.
- `package.json`: `"build:web": "expo export -p web && npx workbox-cli
  generateSW workbox-config.js"` — the exact command Vercel will run.
- **Gates (2026-11-01):** `tsc` ✓ · `npm run build:web` ✓ (49 URLs) ·
  `expo export -p android -p ios` ✓ **identical bundle hashes for the 3rd
  phase in a row** ✓
- Gate-order note: native export overwrites `dist/` — always end with
  `build:web` when you need the web artifact locally (Vercel builds fresh).
- Offline expectation: app shell + fonts + icons only; data needs network.

### Phase 5 — Vercel project, env, DNS ✅ repo-side DONE 2026-11-02
- `vercel.json` created at repo root (per the official Expo
  publishing-websites doc's Vercel template, verbatim except `buildCommand`):
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "buildCommand": "npm run build:web",
    "outputDirectory": "dist",
    "devCommand": "expo",
    "cleanUrls": true,
    "framework": null,
    "rewrites": [{ "source": "/:path*", "destination": "/" }],
    "headers": [ … ]
  }
  ```
  - `buildCommand` = our script (expo export **+ Workbox**), not the doc's
    bare `expo export -p web` — otherwise no service worker on Vercel.
  - `rewrites` destination `"/"` (doc's exact value; serves index.html).
    Real files (`/sw.js`, hashed bundles, icons) win over the rewrite —
    verified: filesystem is checked before rewrites, which is what makes the
    universal SPA recipe work at all.
  - `headers`: `/sw.js` → `no-cache, no-store, must-revalidate` (belt-and-
    braces over Vercel's default `max-age=0, must-revalidate`; guarantees
    every deploy's SW is picked up immediately); `/_expo/:path*` and
    `/assets/:path*` → `public, max-age=31536000, immutable` (Metro content-
    hashes every filename there — repeat visits skip revalidation; root-level
    unhashed files are deliberately NOT covered).
- Vercel env (build-time, inlined by Metro): `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN` (same values as
  EAS secrets; never committed — `.env` is gitignored so Vercel has no file,
  only dashboard vars).
- DNS: `app.absante.ma` → Vercel (CNAME), SSL auto-provisioned.
- **Gates (2026-11-02):** `tsc` ✓ · `npm run build:web` ✓ (49 URLs /
  9.42 MB) · `expo export -p android -p ios` ✓ **identical bundle hashes
  for the 5th phase in a row** (`entry-3e18afb33777c60f0db1b9ae1876db30`
  android, `entry-cdffbe7db31494b3fbf165ee7de0172b` ios) · vercel.json
  parses + all keys schema-valid ✓
- ⏳ Remaining (user/dashboard, see checklist): create Vercel project #2,
  set the 3 env vars, add domain + CNAME, Supabase redirect allowlist,
  push commits (everything still uncommitted on `main`).

### Phase 6 — Web-behavior QA pass
- Agenda date/time pickers (datetimepicker v9 web = DOM inputs).
- ERP: invoice PDF + affiches (`expo-print` → browser print dialog;
  `expo-sharing` → fall back to download/print when `navigator.share` is
  unavailable — add a guarded fallback, native path untouched).
- Image/document uploads (onboarding avatar, verification docs, ERP storage).
- Forms on iPhone Safari: no focus-zoom (≥16px inputs — same rule as the web
  app's landing search).
- Google OAuth under popup blockers; browser back button through the router;
  scrolling feel on mobile Safari.
- Install flow: Add to Home Screen on Android Chrome + iOS Safari, standalone
  launch, icon/splash colors, session persistence.

### Phase 7 — Done gates
- [ ] `npm run typecheck` ✓
- [ ] `npx expo export -p web` ✓ and `npx expo export -p android -p ios` ✓
      (native JS graph proven untouched)
- [ ] Workbox build step ✓
- [ ] `npx expo serve` prod-parity smoke: guest browse → sign-up → login →
      search + map pins → booking → ERP print/share behavior
- [ ] Live on `https://app.absante.ma`, Supabase redirect allowlisted
- [ ] Installed on a real Android + iOS device, survives reload/relaunch
- [ ] One native EAS build re-run (unchanged pipeline) as final confirmation

## 4. Risks & caveats

- **iOS PWA limits** (platform facts, not fixable): no web push; Safari may
  evict the standalone app's storage after ~7 days of non-use → user simply
  signs in again. Native app unaffected — it remains the full-fat experience.
- **Mapbox GL JS**: fits the existing free tier (~50k loads/mo); RUM opt-out
  to match the native app's privacy stance (confirm exact v3 API when
  implementing).
- **Service worker**: kept deliberately dumb (precache-only) per Expo docs'
  warning about aggressive caching; any future caching of Supabase responses
  is off-limits.
- **Scope discipline**: the ERP/affiches print-share flows get web *support*,
  not web *redesign*. Native UX is never touched to accommodate web.

## 5. Effort snapshot

| Phase | Size | Nature |
|-------|------|--------|
| 1 Map components | M | the only real coding |
| 2 Auth web branch | S | one function + dashboard step |
| 3 Manifest/shell | S | config + icons |
| 4 Workbox SW | S | config |
| 5 Vercel/DNS | S | click-ops + env |
| 6 QA pass | M | the phase that protects the launch |
