# AB Santé Mobile — Design System & Component Guide

> This document serves as a reference for future coding agents. It documents the design tokens, component patterns, and layout conventions used in the AB Santé mobile application.
>
> **Design language:** The mobile UI follows an **Airbnb-inspired system** (rounded geometry, photography-first cards, a single scarce accent color, hairline borders, layered shadows) **recolored with the AB Santé brand palette**. Airbnb's Rausch coral (`#ff385c`) is replaced by the brand pink `#F53E8A` as the system's single high-visibility accent. The system stays light-mode only.

---

## 1. Design Tokens

All tokens are defined in `tailwind.config.js` and used via NativeWind utility classes.

### Colors

| Token | Value | Role (Airbnb analog) | Usage ||---|---|---|---|| `primary` | `#F53E8A` | Rausch coral `#ff385c` | Brand accent — primary CTAs, active tab tint, hearts, search submit. Use **sparingly**: one pink element per viewport by default || `primary-50` | `#fdf2f8` | — | Pink tint — icon containers, badge backgrounds || `primary-100` | `#fce7f3` | — | Pink lighter tint — avatar/icon circles || `secondary` | `#3578FF` | Info Blue `#428bff` | Blue accent — secondary buttons, legal/info links || `secondary-50` | `#eff6ff` | — | Blue tint — badge backgrounds || `secondary-tone` | `#0D61B6` | Luxe/deep variant | Darker blue — feature icons, stats numbers || `secondary-tone-50` | `#ecf2fa` | — | Darker blue tint — icon circle backgrounds || `dark` | `#3D4B64` | Ink Black `#222222` | Near-black ink — **all** headings, body, prices. Never true `#000000` || `grayText` | `#667085` | Ash Gray `#6a6a6a` | Secondary copy, metadata, descriptions || `hairline` | `#DDDDDD` | Hairline Gray `#dddddd` | The ubiquitous 1px divider — cards, rows, menu separators || `softCloud` | `#F7F7F7` | Soft Cloud `#f7f7f7` | Subsurface tint — segmented pickers, "step back" sections || `lightBg` | `#F8FAFC` | — | Light background for cards and sections || `pageBg` | `#FEFBFC` | Canvas White `#ffffff` | App page background || `success` | `#10B981` | — | Green — availability, success states || `success-50` | `#ecfdf5` | — | Green tint — success icon backgrounds || `warning` | `#F59E0B` | — | Amber — ratings, stars || `warning-50` | `#fffbeb` | — | Amber tint — rating backgrounds |

### Branding & Logo

The mobile app uses the **official AB Santé logos**:

| File | Background | Usage ||---|---|---|| `applogo.png` | Opaque white (1024×1024) | OS app icon only (`app.json`) — never rendered in-app || `appsplash.png` | Transparent (1024×1024) | Splash screen (`app.json`) + all in-app logos (BrandLogo) |

These are registered in `app.json` (icon + splash) and rendered via the reusable `BrandLogo` component (`components/ui/BrandLogo.tsx`).

### Typography

- **Font family:** `Inter` (system default on iOS/Android, falls back to system-ui)
- **Weights:** body/links/buttons = `font-medium` (500), emphasis = `font-semibold` (600), display/headings = `font-semibold` (600) — never `font-normal` (400) for body copy
- **Body weight is 500** (Airbnb "500 is the new 400"): every paragraph is `font-medium`
- **Negative tracking on display type only:** screen titles use `tracking-[-0.3px]`, section headings `tracking-[-0.44px]`; body/captions stay at 0 tracking
- **Color:** headings & body = `dark`, secondary = `grayText`
- **Scale (mobile-optimized):**  - Screen title: `text-2xl` (24px) `font-semibold` `tracking-[-0.3px]`  - Section heading: `text-[22px]` `font-medium` `leading-[26px]` `tracking-[-0.44px]`  - Card title: `text-base` (16px) `font-semibold`  - Body: `text-sm` (14px) `font-medium`  - Caption / meta: `text-xs` (12px) `font-medium`  - Micro / badges: `text-[11px]` `font-semibold`

### Spacing

- **Screen padding:** `px-5` (20px) horizontal, `pt-4` top for safe area- **Section spacing:** `mt-6` to `mt-8` between sections- **Card padding:** `p-4` to `p-5`- **Gap between elements:** `gap-3` to `gap-4`- **Between stacked text rows:** 4–8px (tight — mirrors Airbnb's dense metadata stacking)

### Border Radius

| Token | Value | Use ||---|---|---|| `rounded-full` | `9999px` | Pills, badges, search bar, buttons, tab bar, icon buttons || `rounded-listing` | `14px` | Doctor-card "photography" tiles || `rounded-panel` | `20px` | Booking-panel-style cards, content panels || `rounded-lg` | `8px` | Primary/secondary CTA buttons, text inputs || `rounded-card` | `34px` | Legacy large cards (compat) |

> All icon buttons and avatars remain **circular** (`rounded-full`) — the system's signature round geometry.

### Shadows (layered elevation, ink-tinted)

| Token | Value | Usage ||---|---|---|| `shadow-panel` | `0 0 0 1px rgba(61,75,100,0.03), 0 2px 6px rgba(61,75,100,0.05), 0 4px 8px rgba(61,75,100,0.08)` | Booking-panel-style cards, modals, dropdowns — the signature **three-layer** Airbnb lift || `shadow-lift` | `0 4px 12px rgba(61,75,100,0.08)` | Active/pressed icon buttons || `shadow-pill` | `0 2px 6px rgba(61,75,100,0.05)` | Search pill, segmented active tab || `shadow-card` | `0 20px 60px rgba(23,37,84,0.10)` | Legacy prominent cards (compat) || `shadow-card-light` | `0 2px 12px rgba(23,37,84,0.06)` | Legacy in-section cards (compat) || `shadow-soft` | `0 4px 20px rgba(23,37,84,0.05)` | Legacy subtle shadow (compat) |

> **Note:** Shadows are ink-tinted (navy `#3D4B64` / `#172554`) rather than pure black, matching the brand. Cards that sit on white canvas generally use `border-hairline` + `shadow-panel` (or no shadow on photo tiles).

### Branding & Logo

The mobile app uses the **official AB Santé logos**:

| File | Background | Usage ||---|---|---|| `applogo.png` | Opaque white (1024×1024) | OS app icon only (`app.json`) — never rendered in-app || `appsplash.png` | Transparent (1024×1024) | Splash screen (`app.json`) + all in-app logos (BrandLogo) |

These are registered in `app.json` (icon + splash) and rendered via the reusable `BrandLogo` component (`components/ui/BrandLogo.tsx`).

### Typography

- **Font family:** `Inter` (system default on iOS/Android, falls back to system-ui)- **Headings:** `font-bold` / `font-extrabold`, color `dark` (`#172554`)- **Body text:** `text-grayText` (`#667085`)- **Scale (mobile-optimized):**  - Display / Hero: `text-3xl` (30px) — `font-extrabold`  - Screen title: `text-2xl` (24px) — `font-extrabold`  - Section title: `text-lg` (18px) — `font-bold`  - Card title: `text-base` (16px) — `font-semibold`  - Body: `text-sm` (14px) — `text-grayText`  - Caption / meta: `text-xs` (12px) — `text-grayText`

### Spacing

- **Screen padding:** `px-5` (20px) horizontal, `pt-4`/`pt-14` top for safe area- **Section spacing:** `mt-6` to `mt-8` between sections- **Card padding:** `p-4` to `p-5`- **Gap between elements:** `gap-3` to `gap-4`

### Border Radius

| Token | Value | Usage ||---|---|---|| `rounded-full` | `9999px` | Pills, badges, search bar, buttons, tab bar || `rounded-3xl` | `24px` | Large cards, doctor cards, appointments cards || `rounded-2xl` | `16px` | Icon containers, small cards, avatar tiles || `rounded-xl` | `12px` | Buttons, chips, inputs |

### Shadows (navy-tinted per skill guidance)

| Token | Value | Usage ||---|---|---|| `shadow-card` | `0 20px 60px rgba(23, 37, 84, 0.10)` | Prominent cards, search bar || `shadow-card-light` | `0 2px 12px rgba(23, 37, 84, 0.06)` | In-section cards || `shadow-soft` | `0 4px 20px rgba(23, 37, 84, 0.05)` | Subtle shadow for small elements / active tab |

> **Note:** All shadows are tinted with the brand navy (`#172554`) rather than pure gray/black, per the mobile-app-ui-design skill ("match shadow colors to the background, never pure gray/black").

---

## 2. Navigation — Floating Bottom Tab Bar

**File:** `app/(tabs)/_layout.tsx`

### Structure

```<Tabs> (floating bottom tab bar)  ├── Home (index)  ├── Search (search)  ├── Appointments (rdv)  └── Profile (profile)```

### Key Patterns

- **Floating style:** `position: 'absolute'`, 1px `#F2F2F2` top hairline, soft navy top shadow
- **Active tab:** `tabBarActiveTintColor: '#F53E8A'` (brand pink, = Airbnb active-tab Rausch tint)
- **Inactive tab:** `tabBarInactiveTintColor: '#6a6a6a'` (Ash)
- **Tab bar background:** `#FFFFFF`, no pill behind icons (clean Airbnb bottom-nav look)
- **Height:** 84px with `paddingTop: 10`, `paddingBottom: 20`
- **Label style:** `fontSize: 12`, `fontWeight: '500'`
- **Header:** hidden (`headerShown: false`) — each screen manages its own header
- **Keyboard:** `tabBarHideOnKeyboard: true`

```tsx<Tabs.Screen  name="index"  options={{    title: 'Accueil',    tabBarIcon: ({ color, size, focused }) => (      <View className={focused ? 'items-center justify-center rounded-full bg-primary-50 px-4 py-1.5' : 'items-center justify-center px-4 py-1.5'}>        <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />      </View>    ),  }}/>```

---

## 4. Home Screen Layout

**File:** `app/(tabs)/index.tsx`

### Structure (top to bottom)

```<SafeAreaView> (bg-pageBg, edges=['top'])  └── <ScrollView> (flex-1, contentContainerStyle={{ paddingBottom: 112 }})      ├── Header (flex-row, justify-between, items-center, px-5, pt-4)      │   ├── <BrandLogo variant="navbar" width={118} height={48} />      │   └── Actions (flex-row, gap-3)      │       ├── Notification bell (h-10 w-10, rounded-2xl, bg-white, shadow-soft)      │       │   └── Red dot badge (absolute, h-2 w-2, rounded-full, bg-primary)      │       └── Avatar (h-10 w-10, rounded-2xl, bg-primary-100, Ionicons person)      │      ├── Greeting (px-5, mt-6)      │   ├── "Bonjour 👋" (text-2xl, font-extrabold, text-dark)      │   └── "Prenons soin de votre santé aujourd'hui." (text-sm, text-grayText)      │      ├── Personalized Insight Card (mx-5, mt-5) — "peak" moment      │   └── (flex-row, items-center, rounded-3xl, bg-secondary-tone, p-5)      │       ├── "Votre prochain RDV" label (green dot + white semibold text)      │       ├── Doctor name (text-lg, font-bold, white)      │       ├── "Demain · 10:30 · Cardiologie" (text-sm, text-blue-100)      │       ├── "Voir le RDV" button (rounded-full, bg-white, text-secondary-tone)      │       └── Heart icon tile (h-14 w-14, rounded-2xl, bg-white/20, Ionicons heart)      │      ├── Search Bar (mx-5, mt-5)      │   └── (flex-row, items-center, bg-white, rounded-full, shadow-card, px-5, py-4)      │       ├── Search icon tile (h-8 w-8, rounded-full, bg-primary-50, Ionicons search #F53E8A)      │       ├── Text placeholder (text-sm, text-gray-400)      │       └── Filter tile (ml-auto, h-8 w-8, rounded-full, bg-secondary-50, Ionicons options #3578FF)      │      ├── Categories (mt-8)      │   ├── <SectionHeader title="Catégories" actionLabel="Voir tout" />      │   └── Horizontal ScrollView (contentContainerStyle={{ paddingHorizontal: 20, gap: 10, marginTop: 12 }})      │       └── Category tiles (items-center, bg-white, rounded-3xl, shadow-soft, px-4, py-3)      │           ├── Icon circle (h-11 w-11, rounded-full, dynamic `bg`)      │           └── Label (mt-2, text-xs, font-semibold, text-dark)      │      ├── Featured Doctors (mt-8)      │   ├── <SectionHeader title="Médecins populaires" actionLabel="Voir tout" />      │   └── Horizontal ScrollView (gap-14)      │       └── <DoctorCard doctor={...} /> (reusable component)      │      ├── Stats Row (mx-5, mt-8)      │   └── (flex-row, justify-between, bg-white, rounded-3xl, shadow-card-light, p-5)      │       ├── "25K+" / "Rendez-vous"      │       ├── "500+" / "Médecins"      │       └── "4.9★" / "Avis clients"      │      ├── How It Works (mt-8, px-5)      │   ├── "Comment ça marche" (text-lg, font-bold, text-dark)      │   └── Steps (mt-4)      │       └── Step row (flex-row)      │           ├── Icon tile (h-12 w-12, rounded-2xl, bg-secondary-tone OR bg-primary)      │           │   └── Ionicons icon (white) + connecting line (w-0.5, flex-1, bg-slate-200)      │           └── Title (font-semibold, text-dark) + description (text-sm, text-grayText)      │      └── Quick CTA Banner (mx-5, mt-4)          └── (overflow-hidden, rounded-3xl, bg-secondary-tone)              ├── Text "Besoin d'aide ?" (text-lg, font-bold, white)              ├── Description (text-sm, text-blue-100)              ├── Button "Contacter le support" (rounded-full, bg-white, text-secondary-tone)              └── Headset icon tile (h-14 w-14, rounded-2xl, bg-white/20, Ionicons headset)```

---

## 5. Search Screen Layout ("Smart Search")

**File:** `app/(tabs)/search.tsx`

The search screen uses a **"smart search"** pattern (per the mobile-app-ui-design skill: *"Never show a blank search screen — include recent searches, popular/trending items, personalized recommendations"*). It switches between a **discovery view** (empty query) and a **results view** (active query).

### Discovery View (empty query)

```<SafeAreaView> (bg-pageBg)  └── <ScrollView> (flex-1, paddingBottom 112)      ├── Header (px-5, pt-4)      │   ├── "Recherche" (text-2xl, font-extrabold, text-dark)      │   └── "Trouvez le bon médecin pour vous" (text-sm, text-grayText)      │      ├── Search input (mx-5, mt-5)      │   └── (flex-row, items-center, bg-white, rounded-full, shadow-card, px-5, py-3)      │       ├── Ionicons search (#98A2B3)      │       └── <TextInput> (flex-1, text-sm, text-dark) + clear button      │      ├── Recent searches (mt-6) — if any      │   ├── <SectionHeader title="Recherches récentes" actionLabel="Effacer" onAction={clear} />      │   └── Chips (flex-row flex-wrap, gap-2, px-5)      │       └── (rounded-full, bg-white, shadow-soft, px-3, py-2) — clock icon + label      │      ├── Popular specialties (mt-8)      │   ├── <SectionHeader title="Spécialités populaires" />      │   └── Grid (flex-row flex-wrap, gap-3, px-5)      │       └── Cards (flex-1, flex-row, items-center, rounded-2xl, bg-white, p-3, shadow-soft)      │           ├── Icon circle (h-9 w-9, rounded-full, dynamic bg)      │           └── Label (text-xs, font-semibold, text-dark)      │      └── Recommended doctors (mt-8)          ├── <SectionHeader title="Médecins recommandés" actionLabel="Voir tout" />          └── Horizontal ScrollView → <DoctorCard /> components```

### Results View (active query)

```      ├── Filter chips (horizontal ScrollView, gap-10, mt-14)      │   └── Chips (rounded-full, px-4, py-2)      │       ├── Active: bg-primary, text-white      │       └── Inactive: border-slate-200, bg-white, text-dark      │      ├── Results (mt-6)      │   ├── <SectionHeader title="Résultats" actionLabel="Filtres" />      │   └── Result cards (mt-4, gap-4, px-5)      │       └── (rounded-3xl, bg-white, p-4, shadow-card-light)      │           ├── Doctor info row (avatar tile + name + specialty + rating/location)      │           ├── Availability (green dot + text-success)      │           └── "Prendre RDV" button (rounded-full, bg-primary, text-white)```

---

## 6. Appointments Screen Layout

**File:** `app/(tabs)/rdv.tsx`

### Structure

```<SafeAreaView> (bg-pageBg)  └── <ScrollView> (flex-1, paddingBottom 112)      ├── Header (px-5, pt-4)      │   ├── "Rendez-vous" (text-2xl, font-extrabold, text-dark)      │   └── "Gérez vos rendez-vous médicaux" (text-sm, text-grayText)      │      ├── Segmented tabs (mx-5, mt-5)      │   └── (flex-row, rounded-full, bg-slate-100, p-1)      │       ├── "À venir" / "Passés"      │       └── Active: rounded-full bg-white shadow-soft, text-primary      │      ├── Appointment list (mt-6, px-5)      │   └── Appointment cards (rounded-3xl, bg-white, p-4, shadow-card-light)      │       ├── Doctor info (avatar tile + name + specialty + status badge)      │       ├── Date/time (right-aligned, calendar + time icons)      │       └── Actions row (upcoming only): "Reporter" + "Annuler" buttons      │      └── Empty state (mt-10, items-center, px-10)          └── Calendar icon tile + message + "Prendre un rendez-vous" CTA (upcoming only)```

---

## 7. Profile Screen Layout

**File:** `app/(tabs)/profile.tsx`

### Structure

```<SafeAreaView> (bg-pageBg)  └── <ScrollView> (flex-1, paddingBottom 112)      ├── Header (px-5, pt-4)      │   ├── "Profil" (text-2xl, font-extrabold, text-dark)      │   └── "Gérez vos informations personnelles" (text-sm, text-grayText)      │      ├── Profile card (mx-5, mt-5, rounded-3xl, bg-white, p-5, shadow-card-light)      │   ├── Avatar (h-16 w-16, rounded-full, bg-primary-100, Ionicons person)      │   ├── Name + email + "Compte actif" badge (bg-success-50, text-success)      │   └── Edit button (h-10 w-10, rounded-full, bg-primary-50, Ionicons create-outline)      │      ├── Stats mini row (mx-5, mt-4, flex-row, gap-3)      │   └── Stat cards (flex-1, rounded-2xl, bg-white, p-4, shadow-soft)      │       ├── Icon tile + number (text-base, font-bold, text-dark)      │       └── Label (text-xs, text-grayText)      │      ├── Menu (mt-6, px-5)      │   ├── "Compte" (text-lg, font-bold, text-dark)      │   └── Menu items (rounded-3xl, bg-white, p-4, shadow-soft)      │       ├── Icon tile (h-11 w-11, rounded-2xl, dynamic bg)      │       ├── Label (text-sm, font-semibold) + description (text-xs)      │       └── Chevron (Ionicons chevron-forward)      │      └── Logout (mx-5, mt-6)          ├── "Se déconnecter" (rounded-full, border-red-100, bg-red-50, text-red-500)          └── "AB Santé v1.0.0" (text-xs, text-grayText, centered)```

---

## 7b. Professional Dashboard Layout

**File:** `app/(professional)/index.tsx`

The professional home is a **"soft clinical luxury"** dashboard: pastel atmosphere, one gradient hero moment, dense-but-airy data cards, and staggered entrance motion (`react-native-reanimated` `FadeInDown`, 80ms increments).

### Dependencies

- `expo-linear-gradient` — hero card + pastel backdrop + "today" circle. Styled via the `style` prop (StyleSheet), not `className`.

### Structure (top to bottom)

```
<SafeAreaView> (bg-pageBg, edges=['top'])
  ├── Backdrop (absolute, pointerEvents="none")
  │   ├── LinearGradient #FCE7F3 → transparent (height 320)
  │   └── 2 soft blobs (pink rgba(249,168,212,0.18) top-right, blue rgba(191,219,254,0.20) left)
  └── <ScrollView> (paddingBottom 112, RefreshControl)
      ├── Header (px-5, pt-4)
      │   ├── Row: date caption (uppercase, tracking-widest, 11px, grayText) + bell (white circle, hairline, red dot) + avatar (white ring, verified status dot bottom-right)
      │   ├── "Bonjour, {firstName} 👋" (text-[26px] font-semibold tracking-[-0.3px])
      │   └── Pills row: specialty (grayText) + "Vérifié" pill (success-50, shield) + rating pill (warning-50, star, "4.9 (128)")
      ├── Availability card (mx-5, mt-5) — state-aware:
      │   ├── ON: border-[#A7F3D0] bg-[#F0FDF7] + success icon
      │   └── OFF: border-hairline bg-white + neutral icon; SwitchPill on the right
      ├── Hero — next RDV (mx-5, mt-4)
      │   ├── LinearGradient ['#F472B6','#F53E8A','#DB2777'] diagonal, rounded-24, pink glow shadow (shadowColor #F53E8A, opacity 0.3)
      │   ├── Decorative white/10 circles (top-right, bottom-right)
      │   ├── Top row: "Prochain rendez-vous" pill (white/20) + countdown pill ("Dans 1 h 30" / "En cours")
      │   ├── Patient name (22px white) + time row (time-outline) + service row (briefcase-outline, · price MAD)
      │   ├── Right: calendar icon in white/20 circle (h-16)
      │   └── Actions: white pill "Voir l'agenda" + call button (white/20, Linking tel:) when patientPhone exists
      │   └── Empty state: white→primary-50 gradient, "Aucun RDV prévu aujourd'hui" + "Créer un rendez-vous" CTA
      ├── Stats strip (mx-5, mt-4, 3× flex-1 white panels p-3.5)
      │   └── Aujourd'hui (calendar, pink) · Patients (people, #0D61B6) · Revenus (wallet, green, Intl fr-FR + "MAD" suffix)
      ├── Week strip (mx-5, mt-4, white panel p-4)
      │   ├── Header: "Votre semaine" + "{n} RDV · 7 jours"
      │   └── 7 columns from today: weekday letter (WEEKDAY_LETTERS[.getDay()]), today = gradient pink circle, busy days get a primary dot (from dashboard.upcomingAppointments)
      ├── Today timeline (px-5, mt-7) — only when >1 appointment
      │   ├── Header: "RDV du jour" + "Voir tout" → agenda
      │   └── Rows: time gutter (w-12, start/end), rail (dot bg-primary for next / bg-primary-200 otherwise + bg-primary-100 line), white card (name + StatusChip + service · price + italic reason)
      ├── Quick actions (px-5, mt-7) — 4 nested-circle tiles (white outer circle shadow-panel + tinted inner circle h-10 + 12px label): Agenda / Patients / Services / Profil
      └── Verification banner (mx-5, mt-7, when not approved): amber panel + shield + "24–48 h" chip
```

### Data notes

- `DashboardData.upcomingAppointments` (provider-service) = non-cancelled appointments from today through +7 days — powers the week-strip dots and count. No extra query: derived from the same `getProviderAppointments` fetch.
- `nextAppointment` = first of today's appointments whose `endsAt` hasn't passed; countdown computed via `formatCountdown`.
- The hero shows the pink gradient only when a next appointment exists; otherwise a soft white→pink empty state.

---

## 8. Reusable UI Components

All components live in `components/ui/` and are used across screens.

### BrandLogo

```tsximport { BrandLogo } from '@/components/ui/BrandLogo';

<BrandLogo variant="navbar" width={118} height={48} /><BrandLogo variant="standard" /> {/* 160x48 default */}```

- **variant="navbar"** → uses `appsplash.png`, transparent bg (120x48 default)- **variant="standard"** → uses `appsplash.png`, transparent bg (160x48 default)- Both variants render the same transparent logo; `applogo.png` is reserved for the OS app icon only (`app.json`)- Sets `accessibilityRole="image"` and `accessibilityLabel="AB Santé"`

### DoctorCard

```tsximport { DoctorCard } from '@/components/ui/DoctorCard';

const doctor = { name: 'Dr. X', specialty: 'Cardiologue', rating: '4.9', location: 'Casablanca' };<DoctorCard doctor={doctor} ctaLabel="Voir" onPress={handlePress} />```

- Renders 272px-wide (w-64) card with avatar tile, verified badge, name, specialty, optional location, rating pill, and CTA button.

### SectionHeader

```tsximport { SectionHeader } from '@/components/ui/SectionHeader';

<SectionHeader title="Catégories" actionLabel="Voir tout" onAction={handleSeeAll} />```

- Renders title + optional "Voir tout" link with `accessibilityRole="button"`.

---

## 9. Common UI Patterns

### Section Badge (Pill)

```tsx<View className="self-start rounded-full bg-primary-50 px-4 py-2">  <Text className="text-xs font-medium text-primary">Pourquoi choisir AB Santé</Text></View>```

### Card (Panel)

```tsx<View className="rounded-panel border-hairline bg-white p-5 shadow-panel">  {/* Card content */}</View>```

### Icon Container (Circular)

```tsx<View className="h-12 w-12 rounded-full bg-primary-50 items-center justify-center">  <Ionicons name="calendar" size={22} color="#F53E8A" /></View>```

### Trust Badge

```tsx<View className="flex-row items-center gap-2">  <View className="h-6 w-6 rounded-full bg-secondary-50 items-center justify-center">    <Ionicons name="checkmark" size={12} color="#3578FF" />  </View>  <Text className="text-xs font-medium text-dark">Médecins vérifiés</Text></View>```

### Segmented Toggle (appointments)

```tsx<View className="mx-5 mt-5 flex-row rounded-full bg-softCloud p-1">  {tabs.map((tab) => (    <Pressable      key={tab.key}      className={active ? 'flex-1 rounded-full bg-white py-2.5 shadow-soft' : 'flex-1 rounded-full py-2.5'}      onPress={() => setActiveTab(tab.key)}    >      <Text className={active ? 'text-center text-sm font-medium text-dark' : 'text-center text-sm font-medium text-grayText'}>        {tab.label}      </Text>    </Pressable>  ))}</View>```

---

## 10. Iconography

- **Library:** `@expo/vector-icons` → `Ionicons`- **Import pattern:** `import { Ionicons } from '@expo/vector-icons';`- **Sizing:**  - Small inline: `size={12}` or `size={14}`  - Input/field icons: `size={18}` or `size={20}`  - Card icons: `size={22}` or `size={26}`  - Tab bar icons: `size={24}` (default)- **Coloring:** Use `color` prop with brand hex values (e.g., `#F53E8A`, `#0D61B6`, `#3D4B64`, `#6a6a6a`, `#929292`)

### Icon Mapping

| Element | Icon Name | Color ||---|---|---|| Search | `search` | `#98A2B3` / `#F53E8A` (tile) || Notification | `notifications-outline` | `#172554` || Filter/options | `options` | `#3578FF` || Profile | `person` | `#F53E8A` || Star rating | `star` | `#F59E0B` || Doctor | `medkit` | `#0D61B6` || Calendar | `calendar` / `calendar-outline` | `#F53E8A` || Time | `time-outline` | `#172554` || Location | `location-outline` | `#98A2B3` || Check | `checkmark` | `#3578FF` || Heart | `heart` | `#F53E8A` || Shield | `shield-checkmark` | `#0D61B6` || Headset (support) | `headset` | `#FFFFFF` || Home (tab) | `home` / `home-outline` | active: `#F53E8A` || Search (tab) | `search` / `search-outline` | active: `#F53E8A` || Appointments (tab) | `calendar` / `calendar-outline` | active: `#F53E8A` || Profile (tab) | `person` / `person-outline` | active: `#F53E8A` |

---

## 11. Accessibility & UX Guidelines

- **Touch targets:** Minimum 44×44px for all interactive elements- **Contrast:** Text on white must meet WCAG AA (4.5:1 for body, 3:1 for large text)  - `dark` (#3D4B64) on white: ✅ passes  - `grayText` (#667085) on white: ✅ passes (4.6:1)  - `primary` (#F53E8A) on white: ⚠️ use for large text/icons only, not body text- **Safe areas:** Use `react-native-safe-area-context` for top/bottom insets- **Scroll content:** Add `pb-28` (paddingBottom: 112) bottom padding to clear the floating tab bar- **Feedback:** All pressable elements should have `android_ripple` or opacity feedback (`pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }`)- **Dark mode:** Not yet implemented — design is light-mode first- **Labels:** All pressable/touchable elements should expose `accessibilityRole` and `accessibilityLabel`

---

## 12. File Organization

```app/├── _layout.tsx              ← Root layout (Stack, StatusBar, AuthProvider)└── (tabs)/    ├── _layout.tsx          ← Floating tab bar configuration    ├── index.tsx            ← Home screen (redesigned)    ├── search.tsx           ← Search screen (functional UI)    ├── rdv.tsx              ← Appointments screen (tabs + list)    └── profile.tsx          ← Profile screen (menu + stats)components/├── onboarding/              ← Onboarding step components└── ui/    ├── BrandLogo.tsx        ← Reusable brand logo (web logo)    ├── DoctorCard.tsx       ← Reusable doctor card    ├── SectionHeader.tsx    ← Reusable section header    ├── FormInput.tsx    ├── PasswordInput.tsx    ├── PrimaryButton.tsx    └── SplashScreen.tsxassets/├── applogo.png              ← Official logo (copied from web app)└── appsplash.png             ← Official navbar logo (copied from web app)```

---

## 13. Animation & Transition Patterns

| Pattern | Implementation ||---|---|| Card press feedback | `Pressable` with `style={({ pressed }) => pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }}` || Tab switch | Native tab bar animation (default) || List scroll | Native `ScrollView` / `FlatList` || Button press | `Pressable` with opacity + scale feedback |

---

## 14. Content (French)

All UI copy is in French, matching the web app:

| Element | Copy ||---|---|| Greeting | "Bonjour 👋" || Greeting sub | "Comment pouvons-nous vous aider aujourd'hui ?" || Search placeholder | "Rechercher un médecin, spécialité..." || Categories title | "Catégories" || See all | "Voir tout" || Popular doctors | "Médecins populaires" || How it works | "Comment ça marche" || Step 1 | "Recherchez un médecin" / "Filtrez selon la spécialité, la ville ou la clinique." || Step 2 | "Choisissez votre horaire" / "Consultez les disponibilités en temps réel." || Step 3 | "Recevez votre confirmation" / "Une notification vous sera envoyée instantanément." || Stats | "25K+ Rendez-vous" / "500+ Médecins" / "4.9★ Avis clients" || Support banner | "Besoin d'aide ?" / "Notre équipe est disponible 7j/7 pour vous accompagner." || Search header | "Recherche" / "Trouvez le bon médecin pour vous" || RDV header | "Rendez-vous" / "Gérez vos rendez-vous médicaux" || Tab labels | "À venir" / "Passés" || Profile header | "Profil" / "Gérez vos informations personnelles" || Logout | "Se déconnecter" |

---

## 15. Authentication & Onboarding Flows

### Auth Screens

**Files:** `app/(auth)/welcome.tsx`, `login.tsx`, `register.tsx`, `forgot-password.tsx`, `callback.tsx`

#### Welcome Screen

Purpose: Role selection (Professional vs Client)

Visual direction: Minimal, soft, airy, eye-soothing healthcare UI. The MVP favors restrained decoration, generous whitespace, soft shadows, and the official AB Santé pink/blue palette.

Background: bg-pageBg (#FCFBFD) with extremely subtle atmospheric pastel decoration:

Bottom-left: soft pink blob #FFF0F7

Optional top-right: soft blue blob #EEF6FF

Brand: Centered BrandLogo variant="navbar" at approximately 150x150. Do not add a separate "AB Santé" heading because the logo already contains the brand.

Hero copy:

"Bienvenue" — text-[36px] font-bold, text-[#3D4B64]

"Votre santé, au cœur de tout." — text-[17px] font-semibold, text-primary

Small pink divider/underline below the subtitle

Supporting text — text-sm, centered, text-grayText

Role prompt: "Comment souhaitez-vous continuer ?" — centered, text-[15px] font-semibold text-dark

Role cards: Keep the proven horizontal layout:

Entire card is pressable and stacked vertically

min-h-[126px] flex-row items-center rounded-[25px] px-[18px] py-5

White background (bg-white)

shadow-card-light

No visible hard border in the current MVP

Large icon circle on the left: h-[80px] w-[80px] rounded-full

Text content in the center: title + short description

Small circular chevron on the right

Patient accent: pink #F23888

Professional accent: blue #3D91E8

Card press feedback: opacity reduction + slight scale down

Trust section: Centered shield-heart icon in a pale blue circle, followed by:

"Vos données sont sécurisées"

"Confidentialité garantie."

Footer: "Déjà un compte ? Connectez-vous" with the action in brand pink.

Navigation: Tapping a card navigates to /(auth)/register?role=professional or ?role=client.

#### Login Screen- **Header:** Back button (`chevron-back`) + centered logo + title "Connexion"- **Form:** Email + password inputs with validation- **Actions:** "Mot de passe oublié ?" link, Google OAuth button- **Footer:** "Pas de compte ? Créez-en un" link to register

#### Register Screen- **Role badge:** Shows selected role from query param with icon- **Form fields:** Nom complet, Email, Mot de passe, Confirmer mot de passe- **Terms checkbox:** Custom checkbox with conditions/privacy policy links- **Email confirmation state:** Shows success message if Supabase returns no session

#### Forgot Password Screen- **Email input** + submit button- **Success state:** Checkmark icon + confirmation message

### Onboarding Screens

**Files:** `app/(onboarding)/professional.tsx`, `client.tsx`, `completion.tsx`

#### Professional Onboarding (5-Step Wizard)

**Step indicator:** `components/onboarding/StepIndicator.tsx`- Horizontal progress bar with 5 segments- Numbered circles (1-5) with step labels below- Active/completed steps: `bg-primary` pink- Incomplete steps: `bg-slate-200`

**Step components:**1. `StepProfession` — Grid of 6 profession cards (2 columns)2. `StepPersonalInfo` — Avatar upload + name/contact + gender + languages + bio3. `StepOrganization` — Organization info + address + facility toggles4. `StepServices` — Service list + working hours table5. `StepVerification` — Document upload + terms checkbox

**Navigation:**- Bottom bar with "Retour" (if step > 0) + "Continuer" / "Terminer l'inscription"- Validation before proceeding to next step- Submission uploads avatar + documents, then calls `submitOnboarding()`

#### Client Onboarding- Simple form: Prénom, Nom, Téléphone- Submits via `createClientProfile()`- Redirects to completion screen

#### Completion Screen- Success icon: `h-24 w-24 rounded-full bg-success-50` with `checkmark-circle`- Message: "Félicitations !" + validation notice- CTA: "Accéder à l'application" button

### Auth Guard Pattern

**Root layout:** `app/_layout.tsx`- Wraps app in `AuthProvider`- Shows `SplashScreen` while loading- Child routes handle their own auth redirects

**Onboarding layout:** `app/(onboarding)/_layout.tsx`- Redirects unauthenticated users to `/(auth)/welcome`- Redirects users without onboarding to `/(tabs)`

**Tabs layout:** `app/(tabs)/_layout.tsx`- Redirects unauthenticated users to `/(auth)/welcome`- Redirects users needing onboarding to `/(onboarding)/professional`

### Color Tokens (Auth/Onboarding)

| Token | Value | Usage ||---|---|---|| `success` | `#10B981` | Success icons, confirmation states || `success-50` | `#ecfdf5` | Success icon backgrounds || `primary` | `#F53E8A` | Primary buttons, active states, highlights || `primary-50` | `#fdf2f8` | Icon containers, badges || `dark` | `#3D4B64` | Headings, primary text || `grayText` | `#667085` | Body text, descriptions || `pageBg` | `#FEFBFC` | Page background |

### Typography (Auth/Onboarding)

- **Screen title:** `text-2xl font-medium text-dark` (tracking-[-0.3px])- **Section title:** `text-lg font-semibold text-dark`- **Body:** `text-sm font-medium text-grayText`- **Caption:** `text-xs text-grayText`- **Button:** `text-base font-medium text-white` (on primary) / `text-dark` (on white)

### Common Patterns

**Back button:**```tsx<Pressable className="self-start rounded-full border-hairline bg-white p-3 shadow-soft">  <Ionicons name="chevron-back" size={24} color="#3D4B64" /></Pressable>```

**Form input with icon:**```tsx<FormInput  label="Email"  placeholder="vous@exemple.com"  iconName="mail"  value={email}  onChangeText={setEmail}  keyboardType="email-address"  autoCapitalize="none"  error={errors.email}/>```

**Primary button:**```tsx<PrimaryButton  title="Se connecter"  onPress={handleLogin}  loading={loading}/>```

**Error alert:**```tsx{error && (  <View className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">