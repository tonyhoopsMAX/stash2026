'use client';

// useStandalone
//
// STASH renders the same React tree as a regular website, an installed PWA
// (Add-to-Home-Screen, `display: standalone`), and inside the Capacitor /
// Tauri native shells. Some UI is only useful in one of those modes:
//
//   * The "Add to Home Screen" install modal is pointless when the app is
//     already running as an installed PWA.
//   * The browser "install" prompt is fired by the
//     `beforeinstallprompt` event, which only fires in the regular browser
//     tab — never in standalone, never in native.
//
// This hook returns a discriminated `mode` so callers can make a single
// decision: "should I show install UI?". It also exposes the granular
// signals so tests and analytics can verify the right mode is being
// detected.

import * as React from 'react';

export type AppMode = 'standalone' | 'native' | 'browser';

declare global {
  interface Window {
    __TAURI__?: unknown;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
}

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  return !!cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
}

/**
 * SSR-safe. Returns `'browser'` on the server and on the first render before
 * any effect runs, then resolves to the true mode after mount.
 */
export function useStandalone(): AppMode {
  const [mode, setMode] = React.useState<AppMode>('browser');

  React.useEffect(() => {
    if (isTauri() || isCapacitorNative()) {
      setMode('native');
      return;
    }
    // The media query is the canonical iOS Safari signal. iOS Safari does
    // not set `navigator.standalone` reliably; the media query does.
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const minimal = window.matchMedia('(display-mode: minimal-ui)').matches;
    if (standalone || fullscreen || minimal) {
      setMode('standalone');
      return;
    }
    // iOS Safari legacy fallback.
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) {
      setMode('standalone');
      return;
    }
    setMode('browser');
  }, []);

  return mode;
}
