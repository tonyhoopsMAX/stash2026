# STASH iPhone PWA Audit & Polish — Plan

## Goals
Make STASH feel right on iPhone Safari PWA (Add-to-Home-Screen) at 375 / 390 / 414 / 430 pt
widths, with notch + Dynamic Island + home indicator, in portrait and landscape. Preserve
Android (Capacitor shell) and Windows (Tauri shell) behavior. No paid Apple services or
native iOS signing.

## Audit dimensions

### 1. iPhone-sized viewports
- 375 pt (SE 3rd gen), 390 pt (14/15/16), 414 pt (Plus / Max), 430 pt (16 Pro Max / Plus).
- Tests in tests/e2e/ at 390x844 (iPhone 14) and 430x932 (16 Pro Max).
- Avoid 100vh (use 100dvh where dynamic UI changes height).
- Verify horizontal scroll is impossible at the narrowest width.

### 2. Safe-area insets
- env(safe-area-inset-top) already on .app-topbar; verify it survives the iOS 100vh
  collapse when the URL bar collapses.
- env(safe-area-inset-bottom) is consumed by --bottom-nav-reserve. The current topbar
  pad uses max(.8rem, env(safe-area-inset-top)) which is good.
- env(safe-area-inset-left/right) — not currently handled. iOS Safari landscape on
  notch devices (14 Pro etc.) pushes content under the notch on the leading edge.
  Add a CSS @supports padding-left/right for landscape.

### 3. Standalone / Add-to-Home-Screen mode
- Manifest already has display: standalone, theme/background, icons. Good.
- appleWebApp.capable is true, statusBarStyle: 'black-translucent', title: 'STASH'. Good.
- apple-touch-icon: apple-touch-icon-180x180.png. Good.
- Missing: apple-touch-startup-image (splash). Optional but helpful.
- Missing: standalone detection. The in-app install modal currently fires for everyone.
  Hide the install modal in standalone display mode.
- Missing: cap splash screen behind status bar in standalone. Verify with
  background: var(--background) on html.

### 4. Bottom navigation
- Bottom nav is 4.8rem tall + .65rem offset + safe-area-inset-bottom. Good.
- Touch target per item: full height (4.8rem) split 5 ways. Width on iPhone 14 is
  390 - 2rem (left+right of nav) = 358px / 5 = 71.6px. Apple recommends 44pt min —
  71.6px is fine.
- However the active-item width: in 5-column grid, the text "Settings" might wrap.
  Verify with explicit white-space: nowrap.
- In landscape on iPhone, the bottom-nav is too tall vertically (76.8px) for a
  932x430 landscape (height ~375 logical px). Add a landscape media query that
  reduces the dock height on landscape phones (max-height: 480px and orientation:
  landscape).

### 5. Keyboard behavior
- iOS Safari resizes the visual viewport when the soft keyboard opens. The CSS
  viewport (100dvh) shrinks. Without intervention, the bottom nav remains positioned
  in the original document flow but is squished against the keyboard.
- Fix: hook into window.visualViewport.resize via a useKeyboardOpen hook. When the
  keyboard is open (visualViewport.height < window.innerHeight * 0.75), hide the
  bottom-nav and FAB so the user can see and use the input freely.
- Also: when an input gets focus, call element.scrollIntoView({ block: 'center' })
  so the input is visible above the keyboard.
- Use inputMode="..." hints on numeric / URL / email inputs.

### 6. Touch targets
- Apple HIG: 44x44pt minimum.
- .icon-button is 2.75rem = 44px. Good.
- .app-topbar icon buttons (Activity, Bell): h-9 w-9 = 36px. Bump to h-10 w-10.
- Capture card +/- button is capture-plus 3.6rem = 57.6px. Good.
- Floating add: 3.85rem = 61.6px. Good.
- Settings rows use padding .85rem, so tap target is full row height. Good.
- Tags +/Add in detail screen: h-7 w-7 = 28px. Bump to h-8 w-8 with adequate padding.
- Search filter chips: have padding .62rem 1rem and font-size .82rem, so tap
  target is ~36px. Acceptable but on the small side. Bump padding slightly.
- Quick action type buttons (home quick-capture card): padding .65rem .15rem and
  the text "Screenshot" — the touch target may be 60x60 which is fine.

### 7. Local IndexedDB persistence
- On iOS Safari, IndexedDB is stored in the cache partition. Under storage pressure
  the OS may evict the entire database.
- requestPersistent() once on first save to mark the storage as persistent.
- Detect persisted() and show a banner on the Backup screen when at risk (usage
  > 60% of quota) and not persisted.

### 8. Install guidance
- Public install page (app/install/page.tsx) — text instructions, no iOS-specific
  guidance. Improve: add "Make sure you use Safari" callout, mention that other
  iOS browsers can install via the system "Add to Home Screen" only when iOS
  supports it (iOS 16.4+).
- In-app install modal (AppShell) — already has iOS / Android / Mac-Windows cards.
  Add: don't show modal if already in standalone.
- Add an in-app "Add to Home Screen" walkthrough for iOS that uses a custom
  highlight overlay (small arrow pointing up to the share icon) — optional,
  keep simple.

## Out of scope (per instructions)
- No native iOS signing (no Xcode, no provisioning profiles).
- No paid Apple services (no App Store Connect, no TestFlight, no Apple Pay, no
  Sign in with Apple, no APNs).
- No native iOS shell (Capacitor iOS) — only the PWA.

## Implementation order
1. CSS: add --bottom-nav-reserve landscape variant, bump icon-button h-9 to h-10
   in AppShell topbar, add safe-area-inset-left/right for landscape.
2. New hook: hooks/use-visual-viewport.ts — exports useKeyboardOpen, useViewport().
3. AppShell: use the hook to hide bottom-nav + FAB + fab-menu on keyboard, and
   to call scrollIntoView on input focus.
4. Add apple-touch-startup-image (splash) meta to layout.tsx.
5. Manifest: ensure apple-touch-icon is present in the icon list.
6. Standalone detection: hooks/use-standalone.ts + wire into AppShell install
   modal and the in-app Install screen.
7. Persistence: lib/stash/persistence.ts — requestPersistent() on first save,
   and a small banner component used by BackupScreen.
8. Public install page: improve iOS copy.
9. Tests: extend tests/e2e/stash.spec.ts with iPhone 14 / 16 Pro Max viewports.
10. Unit tests: hooks tests for useKeyboardOpen + useStandalone.
11. Regression test: extend tests/unit/typography-tokens.test.ts (or new file) to
    cover landscape safe-area, and to forbid hard-coded 100vh in non-allowlist
    selectors.
12. Run typecheck / lint / unit / build locally, push, open PR, CI, merge, trigger
    Android + Windows builds, verify artifacts.
