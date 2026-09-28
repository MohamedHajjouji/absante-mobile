# Asset Requirements — AB Santé Production Build

This guide specifies the exact image files needed for a production-ready
Expo SDK 57 app using EAS Build.

> EAS Build generates all platform-specific sizes (iOS app icons at every
> resolution + Android adaptive icons) from these source files.

---

## 1. App Icon — `assets/icon.png`

| Property        | Requirement                                         |
|-----------------|-----------------------------------------------------|
| Dimensions      | **1024 × 1024 px** (exactly square)                 |
| Format          | **PNG**                                             |
| Name            | `icon.png` (referenced by `app.json` → `expo.icon`) |
| Background      | **Opaque white** — fills the entire square          |
| Corners         | **Square** — no rounded corners (OS masks them)     |
| Safe zone       | Logo inset to **~660 px**, centered — nothing       |
|                 | touches the canvas edges                            |

**Why the padding?** Android adaptive icons mask ~25% off each edge
(circle / squircle / rounded-square). The old `applogo.png` was artwork
bleeding to the canvas edges, so the OS cropped the "AB SANTÉ" text and
the hand graphic — the "doesn't fit" look. `icon.png` keeps the artwork
inside the safe zone, so masks only crop white padding.

### Regenerating

```bash
cd $TEMP/opencode/iconwork   # `sharp@0.34` sandbox (not a project dep)
node gen.mjs                 # rebuilds icon.png / adaptive-icon.png / splash-icon.png
```

Source art: `applogo.png` (1024×1024, opaque). Keep it — it is the master.

---

## 2. Android Adaptive Icon — `assets/adaptive-icon.png`

| Property        | Requirement                                         |
|-----------------|-----------------------------------------------------|
| Dimensions      | **1024 × 1024 px**                                  |
| Format          | **PNG**                                             |
| Safe zone       | Same 660 px centered inset as `icon.png`            |

Wired in `app.json`:

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "monochromeImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#FFFFFF"
  }
}
```

---

## 3. Splash Screen — `assets/splash-icon.png`

| Property        | Requirement                                         |
|-----------------|-----------------------------------------------------|
| Dimensions      | **1024 × 1024 px** (recommended)                    |
| Format          | **PNG, transparent**                                |
| Content         | Logo only, inset to **~640 px**, centered           |

Wired in `app.json` twice (legacy key + SDK 57 plugin):

```json
"splash": {
  "image": "./assets/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#FFFFFF"
}
```

```json
["expo-splash-screen", {
  "image": "./assets/splash-icon.png",
  "imageWidth": 200,
  "resizeMode": "contain",
  "backgroundColor": "#FFFFFF"
}]
```

Source art: `appsplash.png` (1024×1024, transparent). Keep it as master;
`BrandLogo` (in-app navbar/auth imagery) still uses `appsplash.png`
because edge-to-edge art fills small UI boxes better.

---

## 4. Building for Production

After adding your images, run:

```bash
eas build --platform all --profile production
```

⚠️ **Production env:** `.env` is gitignored and is NOT uploaded to EAS.
Set the two public vars as EAS secrets before building, otherwise the
app opens without Supabase credentials:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://xxx.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...
```

> ⚠️ Do **not** use `expo start` / Expo Go to test splash screens. Use a
> production or preview build for accurate splash screen testing.
