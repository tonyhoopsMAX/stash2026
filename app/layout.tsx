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

export const metadata: Metadata = {
  title: { default: 'STASH — Save now. Find it when it matters.', template: '%s · STASH' },
  description: 'A private, local-first place for screenshots, links, notes, files, and ideas.',
  manifest: '/manifest.json',
  icons: { icon: [{ url: '/favicon.ico', sizes: '48x48' }, { url: '/icon.svg', type: 'image/svg+xml' }], apple: '/apple-touch-icon-180x180.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'STASH' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#061112' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var w=typeof window!=="undefined"?window:null;if(!w)return;var f=w.fetch?w.fetch.bind(w):null;try{Object.defineProperty(w,"fetch",{get:function(){return f;},set:function(v){f=v;},configurable:true,enumerable:true});}catch(e1){try{var p=Object.getPrototypeOf(w);if(p){Object.defineProperty(p,"fetch",{get:function(){return f;},set:function(v){f=v;},configurable:true,enumerable:true});}}catch(e2){}}}catch(e){}})();if(typeof window!=="undefined"&&"serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js",{scope:"/"}).then(function(r){console.log("[PWA] Service Worker registered:",r.scope);}).catch(function(e){console.warn("[PWA] Service Worker registration failed:",e);});});}`,
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
