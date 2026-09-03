import { db } from './db';
import type { StashCollection, StashItem, StashSettings } from './types';

type PortableItem = Omit<StashItem, 'blob'> & { asset?: { mimeType: string; data: string } };
interface BackupPayload { version: 1; exportedAt: string; items: PortableItem[]; collections: StashCollection[]; settings: StashSettings; }

const blobToData = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode backup asset.'));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export async function exportBackup() {
  const [items, collections, settings] = await Promise.all([db.items.toArray(), db.collections.toArray(), db.settings.get('settings')]);
  const portable: PortableItem[] = await Promise.all(items.map(async ({ blob, ...item }) => ({
    ...item,
    asset: blob ? { mimeType: blob.type, data: await blobToData(blob) } : undefined,
  })));
  const payload: BackupPayload = { version: 1, exportedAt: new Date().toISOString(), items: portable, collections, settings: settings! };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const filename = `stash-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return new File([blob], filename, { type: 'application/json' });
}

export async function importBackup(file: File) {
  const payload = JSON.parse(await file.text()) as BackupPayload;
  if (payload.version !== 1 || !Array.isArray(payload.items) || !Array.isArray(payload.collections)) throw new Error('This is not a valid STASH backup.');
  const items: StashItem[] = await Promise.all(payload.items.map(async ({ asset, ...item }) => ({
    ...item,
    blob: asset ? await (await fetch(asset.data)).blob() : undefined,
  })));
  await db.transaction('rw', db.items, db.collections, db.settings, async () => {
    await db.items.clear();
    await db.collections.clear();
    await db.items.bulkPut(items);
    await db.collections.bulkPut(payload.collections);
    await db.settings.put(payload.settings);
  });
}
