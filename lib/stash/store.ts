'use client';

import { create } from 'zustand';
import { db, ensureSeeded, resetSampleData } from './db';
import { defaultSettings } from './sample-data';
import { persistThemeId, readStoredThemeId } from './themes';
import type { AppView, CreateItemInput, StashCollection, StashItem, StashItemType, StashSettings } from './types';
import { markPersistRequested, requestPersist, wasPersistRequested } from './persistence';

// Fire the first-save hint so AppShell (or any other consumer) can
// request persistent storage once the user has done something real with
// STASH. iOS Safari auto-grants in most cases; Chromium requires user
// activation, which a save initiated by the user provides. We keep this
// fire-and-forget so it never blocks the save path.
function notifyFirstSave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new Event('stash-first-save'));
    if (!wasPersistRequested()) {
      markPersistRequested();
      void requestPersist();
    }
  } catch {
    /* SSR / no window */
  }
}

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Search history starts empty. It only reflects searches the user actually
// performed, so we never advertise content that may not exist.
const INITIAL_RECENT_SEARCHES: string[] = [];

interface StashState {
  items: StashItem[];
  collections: StashCollection[];
  settings: StashSettings;
  ready: boolean;
  view: AppView;
  activeId?: string;
  query: string;
  typeFilter: string;
  sort: 'newest' | 'oldest' | 'title';
  layoutMode: 'list' | 'grid';
  addOpen: boolean;
  initialTypeForAdd: StashItemType;
  recentSearches: string[];
  load: () => Promise<void>;
  navigate: (view: AppView, activeId?: string) => void;
  setQuery: (query: string) => void;
  setTypeFilter: (filter: string) => void;
  setSort: (sort: StashState['sort']) => void;
  setLayoutMode: (mode: 'list' | 'grid') => void;
  setAddOpen: (open: boolean) => void;
  openAddWithType: (type: StashItemType) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  createItem: (input: CreateItemInput) => Promise<StashItem>;
  updateItem: (id: string, patch: Partial<StashItem>) => Promise<void>;
  toggleItem: (id: string, key: 'pinned' | 'favorite') => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  trashItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  deleteForever: (id: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  updateSettings: (patch: Partial<StashSettings>) => Promise<void>;
  resetToSample: () => Promise<void>;
}

export const useStashStore = create<StashState>((set, get) => ({
  items: [],
  collections: [],
  settings: defaultSettings,
  ready: false,
  view: 'home',
  query: '',
  typeFilter: 'all',
  sort: 'newest',
  layoutMode: 'list',
  addOpen: false,
  initialTypeForAdd: 'screenshot',
  recentSearches: INITIAL_RECENT_SEARCHES,

  load: async () => {
    // Bounded load: if the IndexedDB open ever stalls (which intermittently
    // happens under a fresh browser context), don't leave the app on the
    // splash forever. Fall back to an empty, usable store after a timeout and
    // log the situation so it is still visible in CI/console.
    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_resolve, reject) =>
          setTimeout(() => reject(new Error(`STASH load timeout after ${ms}ms`)), ms)
        ),
      ]);

    try {
      await withTimeout(ensureSeeded(), 8000);
      const [items, collections, settings] = await withTimeout(
        Promise.all([
          db.items.toArray(),
          db.collections.toArray(),
          db.settings.get('settings'),
        ]),
        8000
      );

      let savedSearches: string[] = INITIAL_RECENT_SEARCHES;
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('stash-recent-searches');
          if (local) savedSearches = JSON.parse(local);
        } catch {
          // ignore
        }
      }

      const merged: StashSettings = settings ? { ...defaultSettings, ...settings } : defaultSettings;
      // A settings row written before the theme system has no `themeId`;
      // prefer the localStorage mirror so a theme chosen (but not yet fully
      // persisted) still wins after a restart/reload.
      if (!settings?.themeId) {
        const mirrored = readStoredThemeId();
        if (mirrored) merged.themeId = mirrored;
      }

      set({
        items,
        collections,
        settings: merged,
        recentSearches: savedSearches,
        ready: true,
      });
    } catch (err) {
      console.warn('[stash] storage load timed out or failed; rendering with an empty store', err);
      set({ items: [], collections: [], settings: defaultSettings, ready: true });
    }
  },

  navigate: (view, activeId) => {
    set({ view, activeId, addOpen: false });
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        {},
        '',
        view === 'home' ? '/app' : `/app?view=${view}${activeId ? `&id=${encodeURIComponent(activeId)}` : ''}`
      );
    }
  },

  setQuery: (query) => set({ query }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSort: (sort) => set({ sort }),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setAddOpen: (addOpen) => set({ addOpen }),
  openAddWithType: (initialTypeForAdd) => set({ addOpen: true, initialTypeForAdd }),

  addRecentSearch: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const current = get().recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
    const next = [trimmed, ...current].slice(0, 8);
    set({ recentSearches: next });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('stash-recent-searches', JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('stash-recent-searches');
      } catch {
        // ignore
      }
    }
  },

  createItem: async (input) => {
    const now = Date.now();
    const item: StashItem = {
      id: uid(),
      title: input.title.trim() || 'Untitled',
      description: input.description?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      type: input.type,
      url: input.url?.trim(),
      tags: input.tags ?? [],
      collectionId: input.collectionId,
      reminderAt: input.reminderAt,
      blob: input.blob,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      // Never persist a transient `blob:` object URL. When a real Blob is
      // provided it is stored in IndexedDB and a fresh object URL is generated
      // at render time. `imageUrl` is reserved for persistent static assets.
      imageUrl: input.blob ? undefined : input.imageUrl,
      source: input.source || 'Direct capture',
      imageCount: input.type === 'screenshot' || input.type === 'image' ? 1 : undefined,
      createdAt: now,
      updatedAt: now,
      lastInteractedAt: now,
      pinned: false,
      favorite: false,
      archived: false,
    };
    await db.items.put(item);
    set({ items: [item, ...get().items], view: 'detail', activeId: item.id, addOpen: false });
    notifyFirstSave();
    return item;
  },

  updateItem: async (id, patch) => {
    const changes = { ...patch, updatedAt: Date.now(), lastInteractedAt: Date.now() };
    await db.items.update(id, changes);
    set({ items: get().items.map((item) => (item.id === id ? { ...item, ...changes } : item)) });
  },

  toggleItem: async (id, key) => {
    const item = get().items.find((entry) => entry.id === id);
    if (!item) return;
    await get().updateItem(id, { [key]: !item[key] });
  },

  archiveItem: async (id) => {
    await get().updateItem(id, { archived: true });
    set({ view: 'inbox', activeId: undefined });
  },

  trashItem: async (id) => {
    await get().updateItem(id, { deletedAt: Date.now(), archived: false });
    set({ view: 'inbox', activeId: undefined });
  },

  restoreItem: async (id) => {
    await get().updateItem(id, { deletedAt: undefined, archived: false });
  },

  deleteForever: async (id) => {
    await db.items.delete(id);
    set({ items: get().items.filter((item) => item.id !== id) });
  },

  createCollection: async (name) => {
    const collection: StashCollection = {
      id: uid(),
      name: name.trim() || 'Untitled collection',
      icon: 'folder',
      color: '#25dac5',
      createdAt: Date.now(),
    };
    await db.collections.put(collection);
    set({ collections: [...get().collections, collection] });
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    // Mirror the theme to localStorage *before* the async IndexedDB write so
    // the pre-paint bootstrap script (app/layout.tsx) finds it instantly on a
    // cold start / reload, even if the transaction is still settling.
    if (patch.themeId) persistThemeId(patch.themeId);
    await db.settings.put(settings);
    set({ settings });
  },

  resetToSample: async () => {
    await resetSampleData();
    const [items, collections, settings] = await Promise.all([
      db.items.toArray(),
      db.collections.toArray(),
      db.settings.get('settings'),
    ]);
    set({
      items,
      collections,
      settings: settings ? { ...defaultSettings, ...settings, onboardingComplete: true } : { ...defaultSettings, onboardingComplete: true },
      recentSearches: [],
      view: 'home',
      activeId: undefined,
    });
  },
}));
