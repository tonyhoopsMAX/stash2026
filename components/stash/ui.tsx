'use client';

import type { ReactNode } from 'react';
import { Archive, File, FileText, Heart, Image, Lightbulb, Link2, MoreHorizontal, Package, Pin, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useStashStore } from '@/lib/stash/store';
import type { StashItem, StashItemType } from '@/lib/stash/types';

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export function Surface({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('stash-surface', className)}>{children}</Tag>;
}

const icons: Record<StashItemType, typeof FileText> = {
  screenshot: Image, image: Image, link: Link2, note: FileText, file: File,
  product: Package, idea: Lightbulb, place: Pin, movie: Sparkles, study: FileText,
};

export function ItemTypeIcon({ type, className = '' }: { type: StashItemType; className?: string }) {
  const Icon = icons[type];
  return <span className={cn('type-icon', 'type-' + type, className)}><Icon size={21} aria-hidden /></span>;
}

export function formatAge(timestamp: number) {
  const delta = Math.max(0, Date.now() - timestamp);
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return Math.floor(delta / 60_000) + 'm ago';
  if (delta < 86_400_000) return Math.floor(delta / 3_600_000) + 'h ago';
  if (delta < 604_800_000) return Math.floor(delta / 86_400_000) + 'd ago';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}

export function ItemRow({ item, compact = false }: { item: StashItem; compact?: boolean }) {
  const { navigate, toggleItem, archiveItem, trashItem, restoreItem, deleteForever } = useStashStore();
  return (
    <article className={cn('item-row group', compact && 'item-row-compact')}>
      <button className="item-main focus-ring" onClick={() => navigate('detail', item.id)} aria-label={'Open ' + item.title}>
        <ItemTypeIcon type={item.type} />
        <span className="min-w-0 flex-1 text-left">
          <strong className="block truncate font-medium">{item.title}</strong>
          <span className="mt-1 block truncate text-sm text-muted-foreground">{item.type[0].toUpperCase() + item.type.slice(1)}{item.collectionId ? ' · ' + item.collectionId : ''}</span>
        </span>
        <time className="shrink-0 self-start text-xs text-muted-foreground">{formatAge(item.createdAt)}</time>
      </button>
      <div className="item-actions">
        {item.favorite && <Heart size={17} className="fill-[var(--stash-accent)] text-[var(--stash-accent)]" aria-label="Favorite" />}
        {item.pinned && <Pin size={17} className="fill-[var(--stash-accent)] text-[var(--stash-accent)]" aria-label="Pinned" />}
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="icon-button focus-ring" aria-label={'Actions for ' + item.title} />}><MoreHorizontal /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-2xl p-2">
            {!item.deletedAt && <DropdownMenuItem onClick={() => toggleItem(item.id, 'pinned')}><Pin />{item.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>}
            {!item.deletedAt && <DropdownMenuItem onClick={() => toggleItem(item.id, 'favorite')}><Heart />{item.favorite ? 'Unfavorite' : 'Favorite'}</DropdownMenuItem>}
            {!item.deletedAt && <DropdownMenuItem onClick={() => archiveItem(item.id)}><Archive />Archive</DropdownMenuItem>}
            {!item.deletedAt && <DropdownMenuItem variant="destructive" onClick={() => trashItem(item.id)}><Trash2 />Move to trash</DropdownMenuItem>}
            {item.deletedAt && <DropdownMenuItem onClick={() => restoreItem(item.id)}><RotateCcw />Restore</DropdownMenuItem>}
            {item.deletedAt && <DropdownMenuItem variant="destructive" onClick={() => deleteForever(item.id)}><Trash2 />Delete forever</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

export function EmptyState({ icon: Icon = Sparkles, title, body, action }: { icon?: typeof Sparkles; title: string; body: string; action?: ReactNode }) {
  return <Surface className="empty-state"><span className="type-icon"><Icon /></span><h3>{title}</h3><p>{body}</p>{action}</Surface>;
}
