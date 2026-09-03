'use client';

// useVisualViewport / useKeyboardOpen
//
// iOS Safari (and most mobile browsers) resize the visual viewport when the
// soft keyboard opens or closes. The layout viewport (`window.innerHeight`)
// does not shrink the same way, so a fixed bottom-positioned element like the
// STASH bottom-nav will stay glued to the bottom of the document and end up
// squished under the keyboard, or worse, block the input field the user is
// trying to type into.
//
// The visualViewport API exposes:
//   * `height`     — the current visible height in CSS pixels
//   * `offsetTop`  — distance from the top of the layout viewport
//   * `scale`      — current zoom (mostly 1 on iOS, sometimes pinch)
//   * `resize`     — fired when any of these change
//
// We expose two hooks:
//   * `useVisualViewport()` returns a live snapshot, used by components that
//     need pixel-perfect positioning (e.g. the install modal's max-height).
//   * `useKeyboardOpen(threshold = 0.75)` returns true when the keyboard is
//     estimated to be open. Used by AppShell to hide the bottom-nav and FAB
//     while the user is typing so they have an unobstructed view of the
//     input field.
// `threshold` is the fraction of the layout viewport height that the visual
// viewport must drop below to be considered "keyboard open". 0.75 means: if
// visualViewport.height < 0.75 * innerHeight, the keyboard is up. This works
// across iOS, Android Chrome, and the Capacitor Android WebView.
//
// Both hooks are SSR-safe (no-op until window is available), single-tab safe,
// and re-bind listeners on dependency changes.

import * as React from 'react';

interface VisualViewportSnapshot {
  /** Visible viewport height in CSS pixels (excludes any open soft keyboard). */
  height: number;
  /** Distance from the top of the layout viewport to the top of the visible area. */
  offsetTop: number;
  /** Current pinch-zoom scale. */
  scale: number;
  /** Layout viewport width in CSS pixels. */
  width: number;
}

const ZERO: VisualViewportSnapshot = { height: 0, offsetTop: 0, scale: 1, width: 0 };

function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.visualViewport !== 'undefined';
}

export function useVisualViewport(): VisualViewportSnapshot {
  const [snapshot, setSnapshot] = React.useState<VisualViewportSnapshot>(ZERO);

  React.useEffect(() => {
    if (!isSupported()) return;
    const vv = window.visualViewport!;
    const sync = () =>
      setSnapshot({
        height: vv.height,
        offsetTop: vv.offsetTop,
        scale: vv.scale,
        width: vv.width,
      });
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  return snapshot;
}

/**
 * Returns true while the device's soft keyboard is estimated to be open.
 *
 * Heuristic: when the visual viewport has collapsed to less than
 * `threshold` (default 0.75) of the layout viewport height, the keyboard is
 * open. The threshold gives a small buffer for Safari's URL bar collapse /
 * expand, which is not a keyboard event.
 */
export function useKeyboardOpen(threshold = 0.75): boolean {
  const { height } = useVisualViewport();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isSupported() || typeof window === 'undefined') return;
    const layoutHeight = window.innerHeight;
    if (height === 0) {
      // Snapshot not yet populated; assume closed.
      setOpen(false);
      return;
    }
    setOpen(height < layoutHeight * threshold);
  }, [height, threshold]);

  return open;
}
