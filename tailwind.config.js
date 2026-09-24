/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand (AB Santé) ──────────────────────────────────────
        // Maps the Airbnb system's single-accent discipline onto the app:
        // primary pink is the only "branded" accent (Rausch → #F53E8A).
        primary: {
          DEFAULT: '#F53E8A',
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#F53E8A',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        secondary: {
          DEFAULT: '#3578FF',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3578FF',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'secondary-tone': {
          DEFAULT: '#0D61B6',
          50: '#ecf2fa',
        },
        // Ink — the system's near-black for every line of text
        dark: '#3D4B64',
        // Ash — secondary / muted copy
        grayText: '#667085',
        // Hairline — the ubiquitous 1px divider (Airbnb #dddddd)
        hairline: '#DDDDDD',
        // Soft Cloud — subtle subsurface tint (Airbnb #f7f7f7)
        softCloud: '#F7F7F7',
        lightBg: '#F8FAFC',
        pageBg: '#FEFBFC',
        success: {
          DEFAULT: '#10B981',
          50: '#ecfdf5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#fffbeb',
        },
      },
      borderRadius: {
        card: '34px',
        'listing': '14px',
        'panel': '20px',
      },
      boxShadow: {
        // Airbnb layered-elevation system (re-tinted to the navy ink)
        // Level 2 — the signature three-layer "booking panel" lift
        panel:
          '0 0 0 1px rgba(61, 75, 100, 0.03), 0 2px 6px rgba(61, 75, 100, 0.05), 0 4px 8px rgba(61, 75, 100, 0.08)',
        // Level 1 — subtle lift for active / pressed icon buttons
        lift: '0 4px 12px rgba(61, 75, 100, 0.08)',
        // Search pill — soft floating feel
        pill: '0 2px 6px rgba(61, 75, 100, 0.05)',
        // Legacy aliases (kept for compatibility)
        card: '0 20px 60px rgba(23, 37, 84, 0.10)',
        'card-light': '0 2px 12px rgba(23, 37, 84, 0.06)',
        soft: '0 4px 20px rgba(23, 37, 84, 0.05)',
      },
    },
  },
  plugins: [],
};
