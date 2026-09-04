import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Fraunces, Space_Grotesk } from 'next/font/google';
import { STASH_THEMES } from '@/lib/stash/themes';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Theme-system display faces. Fraunces carries the serif themes (Archive
// Paper, Noir Atelier, Soft Journal); Space Grotesk the display themes
// (Neo Brutal, Metro Pop). next/font self-hosts them at build time — zero
// runtime requests, fully offline-capable, which the PWA requires.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '700'],
});

// iPhone PWA polish — single root layout. The shared React core renders
// the same tree in the PWA, the Capacitor Android shell, and the Tauri
// Windows shell, so these meta tags need to be right for *all* modes.

export const metadata: Metadata = {
  title: { default: 'STASH — Save now. Find it when it matters.', template: '%s · STASH' },
  description: 'A private, local-first place for screenshots, links, notes, files, and ideas.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon-180x180.png',
  },
  appleWebApp: {
    capable: true,
    // "black-translucent" gives us a layout that extends behind the iOS
    // status bar in standalone; combined with viewportFit: 'cover' the
    // topbar padding-top: env(safe-area-inset-top) keeps the brand mark
    // below the notch / Dynamic Island. The selected theme then rewrites
    // theme-color at runtime so the status-bar tint matches the theme.
    statusBarStyle: 'black-translucent',
    title: 'STASH',
  },
  applicationName: 'STASH',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // theme-color is *not* declared here: the theme system owns the single
  // <meta name="theme-color"> tag below and keeps it in sync with the
  // selected theme (see applyThemeToDocument in lib/stash/themes.ts).
};

// Bootstrap map generated from the theme registry (single source of truth):
// theme id → [cssAttr, scheme]. Runs synchronously before first paint so a
// reload never flashes the wrong theme, including on the splash screen.
const themeBootstrap = STASH_THEMES.map((theme) => [theme.id, theme.cssAttr, theme.scheme]);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#061112" />
        {/* Disable the iOS Safari auto-link of phone numbers — a STASH
          *  item may legitimately contain a phone-shaped string. */}
        <meta name="format-detection" content="telephone=no" />
        {/* Theme bootstrap: set [data-theme] + [data-scheme] from the
         *  localStorage mirror before first paint (app routes only, so the
         *  marketing pages keep the stock OG identity). No async, no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document;var p=d.location.pathname;if(p==="/app"||p.indexOf("/app/")===0){var m=${JSON.stringify(themeBootstrap)};var t=null;try{t=localStorage.getItem("stash-theme-id")}catch(e){}var id=null;for(var i=0;i<m.length;i++){if(m[i][0]===t){id=m[i];break}}if(!id)id=m[0];d.documentElement.setAttribute("data-theme",id[1]);d.documentElement.setAttribute("data-scheme",id[2]);}}}catch(e){}})();`,
          }}
        />
        {/* iPhone launch image. Apple picks the closest size; declaring
         *  both 14/15/16-class and Pro Max sizes covers the common
         *  cases. The image is a solid STASH dark surface so the
         *  transition into the React tree is invisible.
         *
         *  Note: iOS Safari uses the body's background color when no
         *  splash image is supplied, so the launch transition is
         *  already smooth via `themeColor` + `body` background. The
         *  <link> tags below are commented out until we ship the
         *  pre-rendered splash assets; leaving them here as a
         *  documented placeholder.
         *
         *  <link rel="apple-touch-startup-image" href="/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
         *  <link rel="apple-touch-startup-image" href="/splash-1290x2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
         *  <link rel="apple-touch-startup-image" href="/splash-1179x2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
         *  <link rel="apple-touch-startup-image" href="/splash-1242x2688.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
         */}
        {/* Service worker: register at root scope (Cloudflare Pages / any
         *  root deployment). Emits `stash-sw-update` when a new bundle is
         *  waiting so the in-app "Update available" prompt can appear —
         *  updates are never applied silently. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=="undefined"&&"serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js",{scope:"/"}).then(function(r){r.addEventListener("updatefound",function(){var w=r.installing;if(!w)return;w.addEventListener("statechange",function(){if(w.state==="installed"&&navigator.serviceWorker.controller){window.dispatchEvent(new Event("stash-sw-update"))}})})})}).catch(function(e){console.warn("[PWA] Service Worker registration failed:",e)});});}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${spaceGrotesk.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
