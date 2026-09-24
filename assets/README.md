# Asset Requirements — AB Santé Production Build

This guide specifies the exact image files needed for a production-ready
Expo SDK 57 app using EAS Build.

> EAS Build generates all platform-specific sizes (iOS app icons at every
> resolution + Android adaptive icons) from these source files. You only need
> to create **two** PNG images.

---

## 1. App Icon — `assets/applogo.png`

| Property        | Requirement                                         |
|-----------------|-----------------------------------------------------|
| Dimensions      | **1024 × 1024 px** (exactly square)                 |
| Format          | **PNG**                                             |
| Name            | `applogo.png`                                          |
| Background      | **Opaque** — fill the entire square                 |
| Corners         | **Square** — no rounded corners (OS masks them)     |
| Transparency    | **No transparency** — the logo must fill the canvas |

**Why:** EAS Build reads this single 1024×1024 image and generates every
iOS icon size (20×20 through 1024×1024 at 1×/2×/3×) and the Android
adaptive icon foreground/background layers.

### Visual best practices
- Logo should be centered and touch the edges of the 1024×1024 square.
- Text (if any) should be large and legible at small sizes.
- Test against both light and dark wallpapers.

---

## 2. Splash Screen — `assets/appsplash.png`

| Property        | Requirement                                         |
|-----------------|-----------------------------------------------------|
| Dimensions      | **1024 × 1024 px** (recommended)                    |
| Format          | **PNG**                                             |
| Name            | `appsplash.png`                                     |
| Background      | **Transparent**                                     |
| Content         | Logo only, centered with generous padding           |

**Why transparent?** The splash screen fills the screen with your
`backgroundColor` (currently `#FFFFFF` in `app.json`). A transparent PNG
with just the logo centered on top looks polished across all devices.

### Splash screen config in `app.json`
```json
"splash": {
  "image": "./assets/appsplash.png",
  "resizeMode": "contain",
  "backgroundColor": "#FFFFFF"
}
```

- `resizeMode`: `"contain"` (default — shows full image, adds padding) or `"cover"` (fills screen, may crop edges).
- `backgroundColor`: Hex color filling areas not covered by the image.

### Optional: Dark mode variant
To support dark mode, add the `expo-splash-screen` plugin to `app.json`:
```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-web-browser",
  ["expo-splash-screen", {
    "image": "./assets/appsplash.png",
    "backgroundColor": "#FFFFFF",
    "dark": {
      "image": "./assets/appsplash.png",
      "backgroundColor": "#000000"
    },
    "imageWidth": 200
  }]
]
```

---

## 3. Can You Reuse the Same Image?

You *can* use one file for both, but it's not ideal:
- The **app icon** needs an opaque background (no transparency).
- The **splash screen** works best with transparency so the background color shows through.

**Recommendation:** Create two separate files for the best visual result.

---

## 4. Tooling

- **Figma template:** https://www.figma.com/community/file/1170239179037232798 (Expo Splash Screen & App Icon template)
- **Generate from SVG:** Use [droidgen](https://github.com/akexorcist/Android-Asset-Studio) or
  [exp-icon](https://github.com/expo/expo-icon) for automated generation.

---

## 5. Building for Production

After adding your images, run:

```bash
eas build --platform all --profile production
```

This produces:
- **Android:** `.aab` (Android App Bundle) for Google Play Store
- **iOS:** `.ipa` for Apple App Store

> ⚠️ Do **not** use `expo start` / Expo Go to test splash screens. Use a
> production or preview build for accurate splash screen testing.
