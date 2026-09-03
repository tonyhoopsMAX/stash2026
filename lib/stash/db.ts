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
  if (await db.settings.get('settings')) return;
  await db.transaction('rw', db.items, db.collections, db.settings, async () => {
    await db.items.bulkPut(sampleItems);
    await db.collections.bulkPut(sampleCollections);
    await db.settings.put(defaultSettings);
  });
}
