import Dexie, { type EntityTable } from 'dexie';
import { defaultSettings, sampleCollections, sampleItems } from './sample-data';
import type { StashCollection, StashItem, StashSettings } from './types';

class StashDatabase extends Dexie {
  items!: EntityTable<StashItem, 'id'>;
  collections!: EntityTable<StashCollection, 'id'>;
  settings!: EntityTable<StashSettings, 'id'>;

  constructor() {
    super('stash-local');
    this.version(1).stores({
      items: 'id, type, collectionId, createdAt, updatedAt, reminderAt, pinned, favorite, archived, deletedAt, *tags',
      collections: 'id, name, createdAt',
      settings: 'id',
    });
  }
}

// Dexie must be a per-realm singleton. In dev the module graph can be
// evaluated more than once (the RSC boundary plus the client bundle), which
// would otherwise create a second Dexie for the same 'stash-local' IndexedDB.
// Two instances racing to open/upgrade a fresh DB make one block the other's
// version upgrade (a connection holds the old version), so Dexie's open()
// never resolves and the app stays on its splash screen. Pin the instance on
// globalThis so every evaluation shares a single connection.
const DB_KEY = Symbol.for('stash.db.instance');
const g = globalThis as unknown as Record<symbol, StashDatabase | undefined>;
export const db: StashDatabase = g[DB_KEY] ?? (g[DB_KEY] = new StashDatabase());

export async function ensureSeeded() {
  const existingSettings = await db.settings.get('settings');

  // Fresh database: create an empty, private STASH and leave onboarding
  // incomplete so the user can choose Start Empty or Explore Demo. Do not
  // auto-seed sample content or auto-complete onboarding on first run.
  if (!existingSettings) {
    await db.transaction('rw', db.items, db.collections, db.settings, async () => {
      await db.settings.put({ ...defaultSettings, onboardingComplete: false });
    });
    return;
  }

  // Backfill any missing default settings while preserving existing choices.
  const updatedSettings: StashSettings = {
    ...defaultSettings,
    ...existingSettings,
    onboardingComplete: existingSettings.onboardingComplete ?? false,
  };
  await db.settings.put(updatedSettings);

  // Backfill sample media paths if an earlier seed was missing them.
  const cabinItem = await db.items.get('cabin');
  if (cabinItem && !cabinItem.imageUrl) {
    for (const sample of sampleItems) {
      const existing = await db.items.get(sample.id);
      if (existing) {
        await db.items.update(sample.id, {
          imageUrl: sample.imageUrl,
          source: sample.source,
          imageCount: sample.imageCount,
        });
      } else {
        await db.items.put(sample);
      }
    }
  }
}

export async function resetSampleData() {
  await db.transaction('rw', db.items, db.collections, db.settings, async () => {
    await db.items.clear();
    await db.collections.clear();
    await db.items.bulkPut(sampleItems);
    await db.collections.bulkPut(sampleCollections);
    await db.settings.put({ ...defaultSettings, onboardingComplete: true });
  });
}
