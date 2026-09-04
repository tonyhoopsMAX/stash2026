// Platform abstraction for STASH.
//
// The same React core runs as a PWA, a Capacitor Android app, and a Tauri
// Windows app. This module isolates the small set of behaviors that differ per
// platform (saving/opening files, share gestures, back button, status bar) so
// that business logic is never duplicated.
//
// Everything is feature-detected with a graceful web fallback, so the module
// is safe to import in any environment (SSR, PWA, WebView).

declare global {
  interface Window {
    __TAURI__?: unknown;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

export type Platform = 'web' | 'capacitor' | 'tauri';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';
  if (typeof window.__TAURI__ !== 'undefined') return 'tauri';
  if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform?.()) return 'capacitor';
  return 'web';
}

export const platform: Platform = detectPlatform();

export function isNative(): boolean {
  return platform === 'tauri' || platform === 'capacitor';
}

/** Saves a Blob to the user's device. Returns true on success. */
export async function saveBlobFile(blob: Blob, filename: string): Promise<boolean> {
  if (platform === 'tauri') {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters: [{ name: 'STASH Backup', extensions: ['json'] }],
      });
      if (!path) return false;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await writeFile(path, bytes);
      return true;
    } catch {
      // fall through to browser download
    }
  }

  if (platform === 'capacitor') {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const base64 = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      if (typeof Share !== 'undefined') {
        await Share.share({ title: filename, url: undefined, files: [filename] }).catch(() => undefined);
      }
      return true;
    } catch {
      // fall through to browser download
    }
  }

  return browserDownload(blob, filename);
}

/** Opens a file picker. Returns the selected File, if any. */
export async function pickFile(accept = '.json,application/json'): Promise<File | undefined> {
  if (platform === 'tauri') {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const path = await open({ multiple: false, filters: [{ name: 'STASH Backup', extensions: ['json'] }] });
      if (typeof path !== 'string') return undefined;
      const bytes = await readFile(path);
      return new File([bytes], path.split(/[\\/]/).pop() ?? 'backup.json', { type: 'application/json' });
    } catch {
      // fall through to browser picker
    }
  }

  return browserPickFile(accept);
}

export async function shareItem(title: string, text: string, url?: string): Promise<void> {
  if (platform === 'capacitor') {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url });
      return;
    } catch {
      // fall through to Web Share
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch {
      // user cancelled or share unavailable
    }
  }
  if (url) {
    await navigator.clipboard?.writeText(url).catch(() => undefined);
  }
}

/** Registers Android back-button handling so it behaves like a home back button. */
export function registerBackHandler(handler: () => boolean): void {
  if (platform === 'capacitor') {
    void import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        const handled = handler();
        if (!handled && navigator.userAgent.includes('Android')) {
          void App.exitApp();
        }
      }).catch(() => undefined);
    });
  }
}

/**
 * Tint the Android status bar to match the selected theme. Light themes
 * (Archive Paper, Neo Brutal, …) need dark icons; dark themes get light
 * icons. No-op outside Capacitor; safe to call on every theme change.
 */
export function applyStatusBar(theme?: { scheme?: 'light' | 'dark'; statusBarColor?: string }): void {
  if (platform === 'capacitor') {
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      const scheme = theme?.scheme ?? 'dark';
      const color = theme?.statusBarColor ?? '#061112';
      // Style.Light = light icons (over dark bars); Style.Dark = dark icons.
      StatusBar.setStyle({ style: scheme === 'dark' ? Style.Light : Style.Dark }).catch(() => undefined);
      StatusBar.setBackgroundColor({ color }).catch(() => undefined);
    });
  }
}

/**
 * Open a URL outside the app (system browser). Used by Support → Ko-fi and
 * the APK "Download update" action. Deliberately no in-app webview/payment:
 * STASH v1 links out only.
 */
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // Some WebViews block window.open; fall back to a synthetic anchor.
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  }
}

function browserDownload(blob: Blob, filename: string): boolean {
  if (typeof document === 'undefined') return false;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function browserPickFile(accept: string): Promise<File | undefined> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(undefined);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Keep only the data portion; Capacitor expects the raw data string.
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
