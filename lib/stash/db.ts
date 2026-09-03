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

export const db = new StashDatabase();

export async function ensureSeeded() {
  const existingSettings = await db.settings.get('settings');
  if (!existingSettings) {
    await db.transaction('rw', db.items, db.collections, db.settings, async () => {
      await db.items.bulkPut(sampleItems);
      await db.collections.bulkPut(sampleCollections);
      await db.settings.put(defaultSettings);
    });
    return;
  }

  // Backfill default settings if fields are missing
  const updatedSettings: StashSettings = {
    ...defaultSettings,
    ...existingSettings,
  };
  await db.settings.put(updatedSettings);

  // Backfill sample media paths if initial seed was plain
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
    await db.settings.put(defaultSettings);
  });
}
