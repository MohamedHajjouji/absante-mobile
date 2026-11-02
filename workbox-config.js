/**
 * Workbox config for the AB Santé PWA (app.absante.ma).
 *
 * Deliberately precache-only, per the Expo PWA guide's warning about
 * aggressive service workers:
 *  - Everything the app shell needs (js/html/css/ico/json/fonts/images) is
 *    precached at install → the shell opens offline.
 *  - NO runtime caching rules → Supabase API/auth calls always hit the
 *    network. Health data must never be served from a cache.
 *  - skipWaiting + clientsClaim → a new deploy takes over immediately
 *    instead of leaving users stuck on a stale shell.
 *
 * Run via `npm run build:web` (expo export -p web && workbox-cli generateSW).
 */
module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{js,html,css,ico,json,png,ttf,woff,woff2}',
  ],
  // OVERRIDE the schema default ["**/node_modules/**/*"]: expo exports all
  // fonts and hashed media under dist/assets/node_modules/…, and the offline
  // shell needs its icon fonts. (generateSW still pushes swDest + the
  // workbox runtime onto this array itself.)
  globIgnores: [],
  // The SPA entry bundle is ~4.8 MB; workbox's default limit is 2 MB, which
  // silently skips it (the shell would then be blank offline). 10 MB leaves
  // headroom — hashed filenames + CDN compression keep the wire cost sane.
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  swDest: 'dist/sw.js',
  // SPA (web.output: "single"): serve the single index.html for navigations.
  navigateFallback: '/index.html',
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
};
