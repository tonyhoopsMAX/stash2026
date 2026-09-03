'use client';

import { useState, useEffect, type ReactNode } from 'react';
import {
  Archive,
  Camera,
  File,
  FileText,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  Link2,
  MoreHorizontal,
  Package,
  Pin,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStashStore } from '@/lib/stash/store';
import type { StashCollection, StashItem, StashItemType } from '@/lib/stash/types';

export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export function Surface({
  children,
  className = '',
  as: Tag = 'div',
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  [key: string]: unknown;
}) {
  return (
    <Tag className={cn('stash-surface', className)} {...props}>
      {children}
    </Tag>
  );
}

const icons: Record<StashItemType, typeof FileText> = {
  screenshot: Camera,
  image: ImageIcon,
  link: Link2,
  note: FileText,
  file: File,
  product: Package,
  idea: Lightbulb,
  place: Pin,
  movie: Sparkles,
  study: FileText,
};

export function ItemTypeIcon({
  type,
  className = '',
  size = 18,
}: {
  type: StashItemType;
  className?: string;
  size?: number;
}) {
  const Icon = icons[type] || Sparkles;
  return (
    <span className={cn('type-icon', 'type-' + type, className)}>
      <Icon size={size} aria-hidden />
    </span>
  );
}

export function formatAge(timestamp: number) {
  const delta = Math.max(0, Date.now() - timestamp);
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return Math.floor(delta / 60_000) + 'm ago';
  if (delta < 86_400_000) return Math.floor(delta / 3_600_000) + 'h ago';
  if (delta < 604_800_000) return Math.floor(delta / 86_400_000) + 'd ago';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}

export function formatItemMetadata(item: StashItem): string {
  if (item.type === 'link' && item.url) {
    try {
      const host = new URL(item.url).hostname.replace(/^www\./, '');
      return `Link • ${host}`;
    } catch {
      return 'Link';
    }
  }
  if (item.type === 'file' || item.fileName?.endsWith('.pdf')) {
    const sizeStr = item.size ? `${Math.round(item.size / 1024)} KB` : 'PDF';
    return `PDF • ${sizeStr}`;
  }
  if (item.type === 'screenshot' || item.type === 'image') {
    const sizeStr = item.size ? `${(item.size / (1024 * 1024)).toFixed(1)} MB` : 'Image';
    return `Image • ${sizeStr}`;
  }
  if (item.type === 'note') {
    const sizeStr = item.size ? `${(item.size / 1024).toFixed(1)} KB` : `${item.notes ? item.notes.length : 120} chars`;
    return `Note • ${sizeStr}`;
  }
  if (item.type === 'product') {
    return 'Product';
  }
  if (item.type === 'idea') {
    return 'Idea';
  }
  return item.type[0].toUpperCase() + item.type.slice(1);
}

export function CollectionPill({ collection }: { collection?: StashCollection }) {
  if (!collection) return null;
  const iconSymbol =
    collection.id === 'inspiration' ? '✦' :
    collection.id === 'work' ? '💼' :
    collection.id === 'recipes' ? '🍃' :
    collection.id === 'study' ? '🎓' : '📁';

  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground bg-white/5 border border-white/8">
      <span>{iconSymbol}</span>
      <span>{collection.name}</span>
    </span>
  );
}

export function ItemThumbnail({
  item,
  size = 'md',
}: {
  item: StashItem;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.blob]);

  const displayUrl = item.imageUrl || blobUrl;
  const dimensionClass =
    size === 'sm' ? 'w-10 h-10 rounded-xl' :
    size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-12 h-12 rounded-xl';

  if (displayUrl) {
    return (
      <div className={cn('relative shrink-0 overflow-hidden bg-neutral-900 border border-white/10 shadow-sm', dimensionClass)}>
        <img
          src={displayUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {(item.type === 'screenshot' || item.type === 'image') && (
          <span className="absolute bottom-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-teal-500/90 text-neutral-950 shadow-sm">
            <Camera size={9} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative shrink-0 flex items-center justify-center border border-white/10 shadow-sm', dimensionClass, 'type-' + item.type)}>
      <ItemTypeIcon type={item.type} size={size === 'sm' ? 15 : 18} />
    </div>
  );
}

export function ItemRow({
  item,
  compact = false,
}: {
  item: StashItem;
  compact?: boolean;
}) {
  const { collections, navigate, toggleItem, updateItem, archiveItem, trashItem, restoreItem, deleteForever } = useStashStore();
  const collection = collections.find((c) => c.id === item.collectionId);

  return (
    <article
      className={cn(
        'item-row group transition-colors hover:bg-white/[0.03] px-2',
        compact ? 'min-h-[3.8rem] py-1.5' : 'min-h-[4.75rem] py-2'
      )}
    >
      <button
        type="button"
        className="item-main focus-ring flex items-center gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
        onClick={() => navigate('detail', item.id)}
        aria-label={'Open ' + item.title}
      >
        <ItemThumbnail item={item} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <strong className="block truncate font-medium text-[0.93rem] text-foreground group-hover:text-[var(--stash-accent)] transition-colors">
            {item.title}
          </strong>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {collection && <CollectionPill collection={collection} />}
            <span className="truncate">{formatItemMetadata(item)}</span>
          </div>
        </div>
        <time className="shrink-0 self-start text-xs text-muted-foreground/80 mt-1">
          {formatAge(item.createdAt)}
        </time>
      </button>

      <div className="item-actions flex items-center gap-1 ml-2 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleItem(item.id, 'favorite');
          }}
          className={cn(
            'p-1.5 rounded-full hover:bg-white/10 transition-colors focus-ring',
            item.favorite ? 'text-[var(--stash-accent)]' : 'text-muted-foreground/40 hover:text-muted-foreground'
          )}
          aria-label={item.favorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star
            size={16}
            className={item.favorite ? 'fill-[var(--stash-accent)] text-[var(--stash-accent)]' : ''}
          />
        </button>

        {item.pinned && (
          <span className="p-1 text-[var(--stash-accent)]" title="Pinned">
            <Pin size={15} className="fill-[var(--stash-accent)]" />
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="icon-button focus-ring w-8 h-8 rounded-full hover:bg-white/10 text-muted-foreground transition-colors"
                aria-label={'Actions for ' + item.title}
              />
            }
          >
            <MoreHorizontal size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 bg-[#0c1c1e] border-white/15 backdrop-blur-xl shadow-2xl">
            {!item.deletedAt && (
              <DropdownMenuItem onClick={() => toggleItem(item.id, 'pinned')} className="cursor-pointer">
                <Pin size={15} className="mr-2" />
                {item.pinned ? 'Unpin' : 'Pin to top'}
              </DropdownMenuItem>
            )}
            {!item.deletedAt && (
              <DropdownMenuItem onClick={() => toggleItem(item.id, 'favorite')} className="cursor-pointer">
                <Heart size={15} className="mr-2" />
                {item.favorite ? 'Unfavorite' : 'Mark favorite'}
              </DropdownMenuItem>
            )}
            {!item.deletedAt && !item.archived && (
              <DropdownMenuItem onClick={() => archiveItem(item.id)} className="cursor-pointer">
                <Archive size={15} className="mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            {!item.deletedAt && item.archived && (
              <DropdownMenuItem onClick={() => updateItem(item.id, { archived: false })} className="cursor-pointer">
                <RotateCcw size={15} className="mr-2" />
                Return to inbox
              </DropdownMenuItem>
            )}
            {!item.deletedAt && (
              <DropdownMenuItem variant="destructive" onClick={() => trashItem(item.id)} className="cursor-pointer text-red-400">
                <Trash2 size={15} className="mr-2" />
                Move to trash
              </DropdownMenuItem>
            )}
            {item.deletedAt && (
              <DropdownMenuItem onClick={() => restoreItem(item.id)} className="cursor-pointer">
                <RotateCcw size={15} className="mr-2" />
                Restore item
              </DropdownMenuItem>
            )}
            {item.deletedAt && (
              <DropdownMenuItem variant="destructive" onClick={() => deleteForever(item.id)} className="cursor-pointer text-red-400">
                <Trash2 size={15} className="mr-2" />
                Delete forever
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

export function ItemGridCard({ item }: { item: StashItem }) {
  const { collections, navigate, toggleItem } = useStashStore();
  const collection = collections.find((c) => c.id === item.collectionId);
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.blob]);

  const displayUrl = item.imageUrl || blobUrl;

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-[var(--stash-accent)]/40 hover:bg-white/[0.07] hover:shadow-lg">
      <button
        type="button"
        onClick={() => navigate('detail', item.id)}
        className="flex flex-col text-left focus-ring min-w-0 w-full"
      >
        {displayUrl ? (
          <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl bg-neutral-900">
            <img
              src={displayUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-md">
              {item.type}
            </span>
          </div>
        ) : (
          <div className="mb-3 flex h-24 w-full items-center justify-center rounded-xl bg-white/5">
            <ItemTypeIcon type={item.type} size={24} />
          </div>
        )}

        <strong className="block truncate text-sm font-medium text-foreground">
          {item.title}
        </strong>

        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          {collection ? <CollectionPill collection={collection} /> : <span className="capitalize">{item.type}</span>}
          <span>{formatAge(item.createdAt)}</span>
        </div>
      </button>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleItem(item.id, 'favorite');
          }}
          className={cn(
            'p-1 text-xs rounded-full hover:bg-white/10 focus-ring',
            item.favorite ? 'text-[var(--stash-accent)]' : 'text-muted-foreground/50'
          )}
          aria-label={item.favorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star size={14} className={item.favorite ? 'fill-[var(--stash-accent)]' : ''} />
        </button>
        {item.pinned && <Pin size={13} className="text-[var(--stash-accent)] fill-[var(--stash-accent)]" />}
      </div>
    </article>
  );
}

export function EmptyState({
  icon: Icon = Sparkles,
  title,
  body,
  action,
}: {
  icon?: typeof Sparkles;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Surface className="empty-state">
      <span className="type-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </Surface>
  );
}
