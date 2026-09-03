import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    // below the notch / Dynamic Island.
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
  themeColor: [
    // Both light and dark — the browser picks the right one for the
    // current color scheme. Pinned taskbar / status-bar tints on iOS
    // and Android then match STASH instead of the system white.
    { media: '(prefers-color-scheme: light)', color: '#eef7f5' },
    { media: '(prefers-color-scheme: dark)', color: '#061112' },
  ],
};

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
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=="undefined"&&"serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(function(e){console.warn("[PWA] Service Worker registration failed:",e);});});}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
