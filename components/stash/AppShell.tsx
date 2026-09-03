'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Archive,
  Bell,
  Boxes,
  Camera,
  Check,
  Clock3,
  File,
  FileText,
  Heart,
  Home,
  Laptop,
  Lightbulb,
  Link2,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CaptureDialog } from './CaptureDialog';
import {
  AboutScreen,
  AppearanceScreen,
  BackupScreen,
  CollectionScreen,
  CollectionsScreen,
  DetailScreen,
  EditScreen,
  HomeScreen,
  InstallScreen,
  ListScreen,
  SettingsScreen,
} from './screens';
import { cn } from './ui';
import { useStashStore } from '@/lib/stash/store';
import type { AppView, StashItemType } from '@/lib/stash/types';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations?: object;
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal }
      ) => void | Promise<void>;
    };
  }
}

const primaryNav: Array<{ view: AppView; label: string; icon: typeof Home }> = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'inbox', label: 'Inbox', icon: Boxes },
  { view: 'search', label: 'Search', icon: Search },
  { view: 'collections', label: 'Collections', icon: Boxes },
  { view: 'settings', label: 'Settings', icon: Settings },
];

const libraryNav: Array<{ view: AppView; label: string; icon: typeof Home }> = [
  { view: 'resurface', label: 'Resurface', icon: Sparkles },
  { view: 'reminders', label: 'Reminders', icon: Clock3 },
  { view: 'favorites', label: 'Favorites', icon: Heart },
  { view: 'archive', label: 'Archive', icon: Archive },
  { view: 'trash', label: 'Trash', icon: Trash2 },
];

const addChoices: Array<{ type: StashItemType; label: string; icon: typeof File }> = [
  { type: 'screenshot', label: 'Screenshot', icon: Camera },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'note', label: 'Note', icon: FileText },
  { type: 'file', label: 'File', icon: File },
  { type: 'idea', label: 'Idea', icon: Lightbulb },
];

const accentValues = {
  jade: ['#25dac5', '37 218 197'],
  ocean: ['#318cf4', '49 140 244'],
  orchid: ['#a452df', '164 82 223'],
  sunset: ['#ff7a45', '255 122 69'],
  mono: ['#8d9898', '141 152 152'],
} as const;

export function AppShell() {
  const store = useStashStore();
  const { ready, view, activeId, settings, load, navigate, setAddOpen, addOpen } = store;

  const [splash, setSplash] = useState(true);
  const [captureType, setCaptureType] = useState<StashItemType>('screenshot');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [remindersDrawerOpen, setRemindersDrawerOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<{ prompt: () => Promise<void> }>();

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const initialView = params.get('view') as AppView | null;
    if (initialView) {
      useStashStore.setState({ view: initialView, activeId: params.get('id') ?? undefined });
    }
    const timer = window.setTimeout(() => setSplash(false), 550);
    const syncOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    syncOnline();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, [load]);

  useEffect(() => {
    if (ready && !settings.onboardingComplete) setOnboarding(true);
  }, [ready, settings.onboardingComplete]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && systemDark));
    const [hex, rgb] = accentValues[settings.accent] || accentValues.jade;
    root.style.setProperty('--stash-accent', hex);
    root.style.setProperty('--stash-accent-rgb', rgb);
  }, [settings]);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event as Event & { prompt: () => Promise<void> });
    };
    const requestInstall = () => {
      if (deferredInstall) {
        void deferredInstall.prompt();
      } else {
        setInstallModalOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('stash-install-request', requestInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('stash-install-request', requestInstall);
    };
  }, [deferredInstall]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'create_stash_note',
            title: 'Create STASH note',
            description: 'Save a new text note locally in STASH.',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                notes: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
              required: ['title'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            async execute(input) {
              const value = input as { title?: unknown; notes?: unknown; tags?: unknown };
              if (typeof value.title !== 'string' || !value.title.trim()) {
                throw new Error('title must be a non-empty string');
              }
              const item = await useStashStore.getState().createItem({
                type: 'note',
                title: value.title,
                notes: typeof value.notes === 'string' ? value.notes : undefined,
                tags: Array.isArray(value.tags) ? (value.tags as string[]) : undefined,
              });
              return { id: item.id, title: item.title, saved: true };
            },
          },
          { signal: lifecycle.signal }
        )
      ).catch(() => undefined);

      void Promise.resolve(
        context.registerTool(
          {
            name: 'search_stash',
            title: 'Search STASH',
            description: 'Search local saved items by title, notes, description, tags, URLs, and collection.',
            inputSchema: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              const value = input as { query?: unknown };
              if (typeof value.query !== 'string') throw new Error('query must be a string');
              const needle = value.query.trim().toLowerCase();
              return useStashStore
                .getState()
                .items.filter(
                  (item) =>
                    !item.deletedAt &&
                    [item.title, item.description, item.notes, item.url ?? '', ...item.tags]
                      .join(' ')
                      .toLowerCase()
                      .includes(needle)
                )
                .slice(0, 10)
                .map(({ id, title, type }) => ({ id, title, type }));
            },
          },
          { signal: lifecycle.signal }
        )
      ).catch(() => undefined);
    } catch {
      /* Unsupported experimental API. */
    }
    return () => lifecycle.abort();
  }, []);

  const openCapture = (type: StashItemType) => {
    setCaptureType(type);
    setCaptureOpen(true);
    setAddOpen(false);
  };

  const handleWaveformClick = () => {
    setPulseActive(true);
    setTimeout(() => {
      setPulseActive(false);
      navigate('resurface');
    }, 600);
  };

  const dueReminders = store.items.filter(
    (item) => !item.deletedAt && !item.archived && item.reminderAt && item.reminderAt <= Date.now() + 86_400_000
  );

  const screen = (() => {
    switch (view) {
      case 'home':
        return <HomeScreen onCapture={openCapture} />;
      case 'inbox':
      case 'search':
      case 'favorites':
      case 'archive':
      case 'trash':
      case 'reminders':
      case 'resurface':
        return <ListScreen mode={view} />;
      case 'collections':
        return <CollectionsScreen />;
      case 'collection':
        return <CollectionScreen id={activeId} />;
      case 'detail':
        return <DetailScreen id={activeId} />;
      case 'edit':
        return <EditScreen id={activeId} />;
      case 'settings':
        return <SettingsScreen />;
      case 'appearance':
        return <AppearanceScreen />;
      case 'backup':
        return <BackupScreen />;
      case 'install':
        return <InstallScreen />;
      case 'about':
        return <AboutScreen />;
      default:
        return <HomeScreen onCapture={openCapture} />;
    }
  })();

  if (splash || !ready) {
    return (
      <main className="splash-screen flex flex-col items-center justify-center min-h-screen bg-[#071314] text-foreground">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="splash-mark flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--stash-accent)] text-[#032e2a] shadow-2xl shadow-[var(--stash-accent)]/30"
        >
          <Sparkles size={36} />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-5 text-xl font-bold tracking-[0.35em] text-[var(--stash-accent)]"
        >
          S T A S H
        </motion.span>
        <p className="mt-2 text-sm text-muted-foreground">Your space for what matters.</p>
      </main>
    );
  }

  return (
    <main className="app-root min-h-screen bg-background text-foreground">
      {/* Desktop Sticky Sidebar */}
      <aside className="desktop-sidebar">
        <button
          onClick={() => navigate('home')}
          className="brand-button focus-ring flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--stash-accent)] text-[#032e2a] font-bold">
            <Sparkles size={20} />
          </span>
          <span className="text-base font-bold tracking-[0.25em] text-[var(--stash-accent)]">S T A S H</span>
        </button>

        <nav aria-label="App navigation" className="mt-4 space-y-1">
          {primaryNav.map(({ view: itemView, label, icon: Icon }) => (
            <button
              key={itemView}
              onClick={() => navigate(itemView)}
              className={cn('side-nav-item focus-ring', view === itemView && 'is-active')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-label mt-6 mb-2 px-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
          Library
        </div>
        <nav aria-label="Library navigation" className="space-y-1">
          {libraryNav.map(({ view: itemView, label, icon: Icon }) => (
            <button
              key={itemView}
              onClick={() => navigate(itemView)}
              className={cn('side-nav-item focus-ring', view === itemView && 'is-active')}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Local-First Indicator Pill */}
        <div className="local-pill mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs">
          <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', online ? 'online-dot' : 'offline-dot')} />
          <div className="min-w-0">
            <strong className="block font-semibold text-foreground truncate">
              {online ? 'Local & ready' : 'Offline mode'}
            </strong>
            <small className="block text-[10px] text-muted-foreground truncate">
              Your data stays here
            </small>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-stage flex flex-col min-h-screen">
        {/* Top App Bar with S T A S H and Action Icons (Stash 1, 2, 3, 4, 5) */}
        <div className="app-topbar flex items-center justify-between px-4 py-3 sm:px-6">
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2 text-sm font-bold tracking-[0.25em] text-[var(--stash-accent)] focus-ring rounded-lg"
          >
            S T A S H
          </button>

          <div className="flex items-center gap-2">
            {!online && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs text-amber-300">
                <WifiOff size={13} />
                Offline
              </span>
            )}

            {/* Waveform Resurface Pulse */}
            <button
              onClick={handleWaveformClick}
              className={cn(
                'icon-button focus-ring relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all',
                pulseActive && 'border-[var(--stash-accent)] text-[var(--stash-accent)] animate-pulse'
              )}
              aria-label="Resurface pulse"
              title="Resurface pulse"
            >
              <Activity size={17} />
            </button>

            {/* Notification Bell with Badge */}
            <button
              onClick={() => setRemindersDrawerOpen(true)}
              className="icon-button focus-ring relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
              {dueReminders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--stash-accent)] shadow-[0_0_8px_var(--stash-accent)]" />
              )}
            </button>
          </div>
        </div>

        {/* View Page Content */}
        <div className="app-content flex-1 px-4 sm:px-6 pb-28 md:pb-12 max-w-4xl mx-auto w-full">
          {screen}
        </div>

        {/* Quick Add Menu (FAB Speed-dial) */}
        <AnimatePresence>
          {addOpen && (
            <motion.div
              className="fab-menu"
              initial={{ opacity: 0, y: 18, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 370, damping: 27 }}
            >
              {addChoices.map(({ type, label, icon: Icon }, index) => (
                <motion.button
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.035 }}
                  key={type}
                  onClick={() => openCapture(type)}
                  className="fab-option focus-ring"
                >
                  <span>{label}</span>
                  <i>
                    <Icon size={16} />
                  </i>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center Floating Plus Action Button */}
        <button
          onClick={() => setAddOpen(!addOpen)}
          className={cn('floating-add focus-ring shadow-2xl', addOpen && 'is-open')}
          aria-label={addOpen ? 'Close add menu' : 'Add item'}
        >
          {addOpen ? <X size={22} /> : <Plus size={24} />}
        </button>

        {/* Bottom 5-Item Frosted Glass Dock (Stash 1, 2, 3, 4, 5) */}
        <nav className="bottom-nav" aria-label="Primary navigation">
          {/* 1. Home */}
          <button
            onClick={() => navigate('home')}
            className={cn('bottom-nav-item focus-ring', view === 'home' && 'is-active')}
          >
            <Home size={20} />
            <span>Home</span>
          </button>

          {/* 2. Search */}
          <button
            onClick={() => navigate('search')}
            className={cn('bottom-nav-item focus-ring', view === 'search' && 'is-active')}
          >
            <Search size={20} />
            <span>Search</span>
          </button>

          {/* 3. Empty Center Placeholder for Floating FAB */}
          <div className="pointer-events-none" />

          {/* 4. Settings */}
          <button
            onClick={() => navigate('settings')}
            className={cn('bottom-nav-item focus-ring', view === 'settings' && 'is-active')}
          >
            <SlidersHorizontal size={20} />
            <span>Settings</span>
          </button>

          {/* 5. Profile / Alex Morgan Avatar with Status Dot */}
          <button
            onClick={() => navigate('appearance')}
            className={cn('bottom-nav-item focus-ring', view === 'appearance' && 'is-active')}
            aria-label="Profile"
          >
            <div className="relative">
              <img
                src={settings.userAvatar || '/assets/alex_morgan.jpg'}
                alt="Alex Morgan"
                className="h-6 w-6 rounded-full object-cover border border-white/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--stash-accent)] border border-[#071415]" />
            </div>
            <span>Profile</span>
          </button>
        </nav>
      </div>

      {/* Capture Dialog */}
      <CaptureDialog open={captureOpen} initialType={captureType} onClose={() => setCaptureOpen(false)} />

      {/* Onboarding Dialog */}
      <AnimatePresence>
        {onboarding && (
          <motion.div
            className="onboarding-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="onboarding-card"
            >
              <span className="app-icon">
                <Sparkles size={24} />
              </span>
              <p className="eyebrow tracking-[0.2em] text-xs font-bold text-[var(--stash-accent)]">
                WELCOME TO STASH
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
                Remember more.<br />Organize less.
              </h1>
              <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
                Save the useful things that usually disappear across screenshots, tabs, notes, and files. Everything stays on this device.
              </p>
              <div className="onboarding-points my-5 space-y-2 text-sm text-neutral-200">
                <span className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[var(--stash-accent)]" />
                  Private by default in local IndexedDB
                </span>
                <span className="flex items-center gap-2">
                  <WifiOff size={18} className="text-[var(--stash-accent)]" />
                  Works fully offline without any server accounts
                </span>
                <span className="flex items-center gap-2">
                  <Search size={18} className="text-[var(--stash-accent)]" />
                  Instant full-text local search and smart filters
                </span>
              </div>
              <button
                className="primary-button focus-ring w-full rounded-full bg-[var(--stash-accent)] py-3 font-bold text-[#032e2a]"
                onClick={async () => {
                  await store.updateSettings({ onboardingComplete: true });
                  setOnboarding(false);
                }}
              >
                Enter your STASH
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-App Install Guide Modal (replaces window.alert) */}
      <Dialog open={installModalOpen} onOpenChange={setInstallModalOpen}>
        <DialogContent className="rounded-[2rem] border border-white/15 bg-[#091718]/95 p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Laptop size={20} className="text-[var(--stash-accent)]" />
              Install STASH
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add STASH to your device for full-screen offline access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="text-foreground block text-xs font-semibold mb-1">iOS / Safari</strong>
              <p className="text-xs">Tap the Share icon at the bottom of Safari, then choose <strong>“Add to Home Screen”</strong>.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="text-foreground block text-xs font-semibold mb-1">Android / Chrome</strong>
              <p className="text-xs">Tap the three-dot menu in Chrome, then select <strong>“Install app”</strong> or <strong>“Add to Home screen”</strong>.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <strong className="text-foreground block text-xs font-semibold mb-1">Mac & Windows</strong>
              <p className="text-xs">Click the install icon in your address bar to add STASH as a standalone application.</p>
            </div>
          </div>

          <button
            onClick={() => setInstallModalOpen(false)}
            className="w-full rounded-full bg-[var(--stash-accent)] py-2.5 text-xs font-semibold text-[#032e2a]"
          >
            Got it
          </button>
        </DialogContent>
      </Dialog>

      {/* Reminders & Notifications Modal */}
      <Dialog open={remindersDrawerOpen} onOpenChange={setRemindersDrawerOpen}>
        <DialogContent className="rounded-[2rem] border border-white/15 bg-[#091718]/95 p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Bell size={20} className="text-[var(--stash-accent)]" />
              Notifications & Reminders
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Items scheduled for review to help you retain key knowledge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {dueReminders.length > 0 ? (
              dueReminders.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setRemindersDrawerOpen(false);
                    navigate('detail', item.id);
                  }}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.07] cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-medium text-foreground truncate">{item.title}</strong>
                    <span className="text-xs text-[var(--stash-accent)]">
                      {item.reminderAt
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(item.reminderAt)
                        : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">View &gt;</span>
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <Check size={24} className="mx-auto mb-2 text-[var(--stash-accent)]" />
                <p>No reminders due right now. You’re completely caught up!</p>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setRemindersDrawerOpen(false);
              navigate('reminders');
            }}
            className="w-full rounded-full bg-[var(--stash-accent)] py-2.5 text-xs font-semibold text-[#032e2a]"
          >
            View All Reminders
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
