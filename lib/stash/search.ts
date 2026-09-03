import type { StashCollection, StashItem } from './types';

export function searchItems(items: StashItem[], collections: StashCollection[], query: string): StashItem[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  const names = new Map(collections.map((collection) => [collection.id, collection.name]));
  return items.filter((item) => [
    item.title, item.description, item.notes, item.url ?? '', item.fileName ?? '',
    ...item.tags, names.get(item.collectionId ?? '') ?? '',
  ].join(' ').toLocaleLowerCase().includes(needle));
}
