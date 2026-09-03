import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicPage } from '@/components/stash/PublicPage';
export const metadata: Metadata = { title: 'Install' };
export default function InstallPage() {
  return (
    <PublicPage
      eyebrow="INSTALL"
      title="Keep STASH one tap away."
      intro="Install the PWA for a focused, full-screen experience with an offline-ready app shell. No app store, no account — your data stays in this browser's IndexedDB."
    >
      <h2>iPhone and iPad</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        On iOS, STASH is installed as a Progressive Web App through Safari. Other iOS browsers can browse the site but cannot install PWAs.
      </p>
      <ol>
        <li>Open <strong>stash.app</strong> in <strong>Safari</strong>.</li>
        <li>Tap the <strong>Share</strong> button (the square with an arrow pointing up) at the bottom of the screen.</li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Confirm by tapping <strong>Add</strong> in the top-right.</li>
      </ol>
      <p className="text-sm text-muted-foreground leading-relaxed">
        The STASH icon will appear on your home screen. It opens in full-screen mode, works offline, and uses the same safe-area aware layout as a native app.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        <strong>Troubleshooting:</strong> If &ldquo;Add to Home Screen&rdquo; is missing, make sure you&apos;re using Safari (not Chrome, Firefox, or another browser) and that the page has fully loaded.
      </p>

      <h2>Android</h2>
      <ol>
        <li>Open STASH in <strong>Chrome</strong>.</li>
        <li>Open the browser menu (three dots, top-right).</li>
        <li>Choose <strong>Install app</strong> and confirm.</li>
      </ol>
      <p className="text-sm text-muted-foreground leading-relaxed">
        On Android the STASH install works the same as the Android APK, but doesn&apos;t require a separate download. Use whichever entry point you prefer.
      </p>

      <h2>Desktop (Mac and Windows)</h2>
      <ol>
        <li>Open STASH in a supported Chromium browser (Chrome, Edge, Brave, Arc).</li>
        <li>Click the install icon in the address bar, or use the browser menu&apos;s &ldquo;Install STASH&rdquo; item.</li>
        <li>Confirm <strong>Install</strong>.</li>
      </ol>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Firefox and Safari on macOS do not support the Install prompt; in those browsers you can still bookmark STASH and use it in a regular tab.
      </p>

      <h2>After installation</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Open STASH once while connected so the app shell and a small set of icons can be cached. After that, the app works fully offline — including search, the quick-capture card, and reminder scheduling.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Your data lives in this device&apos;s IndexedDB. To move to another device, use <strong>Storage &amp; Backup → Export Backup</strong> to download a portable JSON archive, then import it on the new device.
      </p>

      <div className="callout">
        <strong>Heads-up on iOS storage</strong>
        <p>
          iOS Safari may evict website data under storage pressure. After installing, open STASH occasionally so the browser keeps the database. The &ldquo;Storage &amp; Backup&rdquo; screen will warn you if usage is high.
        </p>
      </div>

      <Link href="/app" className="primary-button focus-ring mt-8">
        Open STASH
      </Link>
    </PublicPage>
  );
}
