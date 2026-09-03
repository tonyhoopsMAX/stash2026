'use client';

import { create } from 'zustand';
import { db, ensureSeeded } from './db';
import { defaultSettings } from './sample-data';
import type { AppView, CreateItemInput, StashCollection, StashItem, StashSettings } from './types';

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
  addOpen: boolean;
  load: () => Promise<void>;
  navigate: (view: AppView, activeId?: string) => void;
  setQuery: (query: string) => void;
  setTypeFilter: (filter: string) => void;
  setSort: (sort: StashState['sort']) => void;
  setAddOpen: (open: boolean) => void;
  createItem: (input: CreateItemInput) => Promise<StashItem>;
  updateItem: (id: string, patch: Partial<StashItem>) => Promise<void>;
  toggleItem: (id: string, key: 'pinned' | 'favorite') => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  trashItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  deleteForever: (id: string) => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  updateSettings: (patch: Partial<StashSettings>) => Promise<void>;
}

export const useStashStore = create<StashState>((set, get) => ({
  items: [], collections: [], settings: defaultSettings, ready: false, view: 'home', query: '', typeFilter: 'all', sort: 'newest', addOpen: false,
  load: async () => {
    await ensureSeeded();
    const [items, collections, settings] = await Promise.all([db.items.toArray(), db.collections.toArray(), db.settings.get('settings')]);
    set({ items, collections, settings: settings ?? defaultSettings, ready: true });
  },
  navigate: (view, activeId) => {
    set({ view, activeId, addOpen: false });
    if (typeof window !== 'undefined') window.history.replaceState({}, '', view === 'home' ? '/app' : `/app?view=${view}${activeId ? `&id=${encodeURIComponent(activeId)}` : ''}`);
  },
  setQuery: (query) => set({ query }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSort: (sort) => set({ sort }),
  setAddOpen: (addOpen) => set({ addOpen }),
  createItem: async (input) => {
    const now = Date.now();
    const item: StashItem = { id: uid(), title: input.title.trim() || 'Untitled', description: input.description?.trim() ?? '', notes: input.notes?.trim() ?? '', type: input.type, url: input.url?.trim(), tags: input.tags ?? [], collectionId: input.collectionId, reminderAt: input.reminderAt, blob: input.blob, fileName: input.fileName, mimeType: input.mimeType, size: input.size, createdAt: now, updatedAt: now, lastInteractedAt: now, pinned: false, favorite: false, archived: false };
    await db.items.put(item);
    set({ items: [item, ...get().items], view: 'detail', activeId: item.id, addOpen: false });
    return item;
  },
  updateItem: async (id, patch) => {
    const changes = { ...patch, updatedAt: Date.now(), lastInteractedAt: Date.now() };
    await db.items.update(id, changes);
    set({ items: get().items.map((item) => item.id === id ? { ...item, ...changes } : item) });
  },
  toggleItem: async (id, key) => {
    const item = get().items.find((entry) => entry.id === id); if (!item) return;
    await get().updateItem(id, { [key]: !item[key] });
  },
  archiveItem: async (id) => { await get().updateItem(id, { archived: true }); set({ view: 'inbox', activeId: undefined }); },
  trashItem: async (id) => { await get().updateItem(id, { deletedAt: Date.now(), archived: false }); set({ view: 'inbox', activeId: undefined }); },
  restoreItem: async (id) => { await get().updateItem(id, { deletedAt: undefined, archived: false }); },
  deleteForever: async (id) => { await db.items.delete(id); set({ items: get().items.filter((item) => item.id !== id) }); },
  createCollection: async (name) => {
    const collection: StashCollection = { id: uid(), name: name.trim() || 'Untitled collection', icon: 'folder', color: '#25dac5', createdAt: Date.now() };
    await db.collections.put(collection); set({ collections: [...get().collections, collection] });
  },
  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch }; await db.settings.put(settings); set({ settings });
  },
}));
