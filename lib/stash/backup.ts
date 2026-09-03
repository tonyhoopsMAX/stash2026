import { db } from './db';
import { saveBlobFile } from './platform';
import type { StashCollection, StashItem, StashSettings, StashItemType } from './types';

type PortableItem = Omit<StashItem, 'blob'> & { asset?: { mimeType: string; data: string } };
interface BackupPayload { version: 1; exportedAt: string; items: PortableItem[]; collections: StashCollection[]; settings: StashSettings; }

const ITEM_TYPES: StashItemType[] = ['screenshot', 'image', 'link', 'note', 'file', 'product', 'idea', 'place', 'movie', 'study'];

const blobToData = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode backup asset.'));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidItem(value: unknown): value is PortableItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || !value.id) return false;
  if (typeof value.type !== 'string' || !ITEM_TYPES.includes(value.type as StashItemType)) return false;
  if (typeof value.title !== 'string') return false;
  if (typeof value.createdAt !== 'number' || typeof value.updatedAt !== 'number' || typeof value.lastInteractedAt !== 'number') return false;
  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string')) return false;
  if (value.asset !== undefined && !(isRecord(value.asset) && typeof value.asset.mimeType === 'string' && typeof value.asset.data === 'string')) return false;
  return true;
}

function isValidCollection(value: unknown): value is StashCollection {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && !!value.id &&
    typeof value.name === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.color === 'string' &&
    typeof value.createdAt === 'number';
}

function isValidSettings(value: unknown): value is StashSettings {
  if (!isRecord(value) || value.id !== 'settings') return false;
  if (typeof value.onboardingComplete !== 'boolean') return false;
  if (!['light', 'dark', 'system'].includes(value.theme as string)) return false;
  if (!['jade', 'ocean', 'orchid', 'sunset', 'mono'].includes(value.accent as string)) return false;
  return true;
}

export async function exportBackup() {
  const [items, collections, settings] = await Promise.all([db.items.toArray(), db.collections.toArray(), db.settings.get('settings')]);
  const portable: PortableItem[] = await Promise.all(items.map(async ({ blob, ...item }) => ({
    ...item,
    asset: blob ? { mimeType: blob.type, data: await blobToData(blob) } : undefined,
  })));
  const payload: BackupPayload = { version: 1, exportedAt: new Date().toISOString(), items: portable, collections, settings: settings! };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const filename = `stash-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], filename, { type: 'application/json' });
  // Uses a native save dialog (Tauri/Windows, Capacitor/Android) when available,
  // otherwise falls back to a standard browser download.
  await saveBlobFile(blob, filename);
  return file;
}

export async function importBackup(file: File) {
  let payload: BackupPayload;
  try {
    payload = JSON.parse(await file.text()) as BackupPayload;
  } catch {
    throw new Error('The file is not valid JSON and cannot be read as a STASH backup.');
  }

  // Validate the ENTIRE payload before touching the database. A corrupt or
  // malformed backup must never clear or overwrite existing user data.
  if (!isRecord(payload) || payload.version !== 1) {
    throw new Error('This is not a valid STASH backup.');
  }
  if (!Array.isArray(payload.items) || !payload.items.every(isValidItem)) {
    throw new Error('The backup contains invalid or incomplete items.');
  }
  if (!Array.isArray(payload.collections) || !payload.collections.every(isValidCollection)) {
    throw new Error('The backup contains invalid collections.');
  }
  if (!isValidSettings(payload.settings)) {
    throw new Error('The backup contains invalid settings.');
  }

  const items: StashItem[] = await Promise.all(payload.items.map(async ({ asset, ...item }) => ({
    ...item,
    blob: asset ? await (await fetch(asset.data)).blob() : undefined,
  })));

  // Only now that everything is known-good do we replace the stored data.
  await db.transaction('rw', db.items, db.collections, db.settings, async () => {
    await db.items.clear();
    await db.collections.clear();
    await db.items.bulkPut(items);
    await db.collections.bulkPut(payload.collections);
    await db.settings.put(payload.settings);
  });
}
