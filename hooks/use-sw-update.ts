'use client';

// Service-worker update flow (web / PWA only — the native shells get their
// updates via the APK updater instead).
//
// Lifecycle:
//   * app/layout.tsx registers `/sw.js` (root scope, works unchanged on
//     Cloudflare Pages) and re-dispatches a `stash-sw-update` window event
//     when a *waiting* worker finishes installing over a running one.
//   * public/sw.js no longer calls skipWaiting() when it is an UPDATE — the
//     new bundle waits so the current session is never yanked from under the
//     user.
//   * This hook flips `updateAvailable` when a waiting worker exists, and
//     `refresh()` posts SKIP_WAITING, waits for the takeover
//     (controllerchange) and reloads — a single, explicit, user-initiated
//     refresh. No silent cache swaps.

import * as React from 'react';

type Listener = () => void;

function onSwUpdate(cb: Listener): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => undefined;
  let disposed = false;
  const subs: Array<{ remove: () => void }> = [];

  const attach = (registration: ServiceWorkerRegistration) => {
    if (disposed) return;
    // A waiting worker already present (e.g. installed while the tab was
    // backgrounded) → surface immediately.
    if (registration.waiting && navigator.serviceWorker.controller) cb();
    const onUpdate = () => {
      const installing = registration.installing;
      if (!installing) return;
      const onState = () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) cb();
      };
      installing.addEventListener('statechange', onState);
      subs.push({ remove: () => installing.removeEventListener('statechange', onState) });
      onState();
    };
    registration.addEventListener('updatefound', onUpdate);
    subs.push({ remove: () => registration.removeEventListener('updatefound', onUpdate) });
  };

  void navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (registration) attach(registration);
    })
    .catch(() => undefined);

  // Event fired by the inline registration script in app/layout.tsx.
  const onWindowEvent = () => cb();
  window.addEventListener('stash-sw-update', onWindowEvent);

  return () => {
    disposed = true;
    window.removeEventListener('stash-sw-update', onWindowEvent);
    subs.forEach((s) => s.remove());
  };
}

export function useSwUpdate(): { updateAvailable: boolean; refresh: () => void } {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const refreshingRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const detach = onSwUpdate(() => setUpdateAvailable(true));

    // Once the waiting worker takes over (after SKIP_WAITING), reload the
    // page exactly once so the fresh bundle is running.
    const onController = () => {
      if (refreshingRef.current) {
        refreshingRef.current = false;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    return () => {
      detach();
      navigator.serviceWorker.removeEventListener('controllerchange', onController);
    };
  }, []);

  const refresh = React.useCallback(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.getRegistration().then((registration) => {
      const waiting = registration?.waiting ?? registration?.installing;
      if (waiting) {
        refreshingRef.current = true;
        waiting.postMessage({ type: 'SKIP_WAITING' });
        // Fallback: if no controllerchange fires within 3s (no-op update),
        // just reload anyway so the user is never stuck on a spinner.
        window.setTimeout(() => {
          if (refreshingRef.current) {
            refreshingRef.current = false;
            window.location.reload();
          }
        }, 3000);
      } else {
        // No waiting worker — a plain reload still revalidates the shell.
        window.location.reload();
      }
    });
  }, []);

  return { updateAvailable, refresh };
}
