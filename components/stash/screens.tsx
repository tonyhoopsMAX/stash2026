'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  Coffee,
  Download,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  File,
  FileArchive,
  FileText,
  FolderPlus,
  Grid,
  Home,
  Heart,
  Info,
  Laptop,
  Layers,
  Lightbulb,
  Link2,
  List,
  MoreHorizontal,
  Palette,
  Pin,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportBackup, importBackup } from '@/lib/stash/backup';
import { STASH_CONFIG, resolveShareUrl } from '@/lib/stash/config';
import { openExternal, pickFile, platform, shareItem } from '@/lib/stash/platform';
import {
  bundledVersionLabel,
  checkForAndroidUpdate,
  readInstalledBuild,
  type UpdateCheckResult,
} from '@/lib/stash/updates';
import { STASH_THEMES, type StashTheme } from '@/lib/stash/themes';
import { rankForResurface } from '@/lib/stash/resurface';
import { searchItems } from '@/lib/stash/search';
import { useStashStore } from '@/lib/stash/store';
import type { StashItem, StashItemType } from '@/lib/stash/types';
import { cn, CollectionPill, EmptyState, formatAge, formatItemMetadata, ItemGridCard, ItemRow, ItemThumbnail, ItemTypeIcon, Surface, useItemMediaUrl } from './ui';

export function PageHeader({
  title,
  eyebrow,
  back,
  action,
}: {
  title: string;
  eyebrow?: string;
  back?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="page-header flex items-center justify-between gap-3 pt-1">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <button
            onClick={back}
            className="icon-button focus-ring shrink-0 w-10 h-10 rounded-full border t-line t-fill-strong flex items-center justify-center t-fill-hover"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="page-header-title text-foreground">{title}</h1>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

const quickTypes: Array<{ type: StashItemType; label: string; icon: typeof FileText }> = [
  { type: 'screenshot', label: 'Screenshot', icon: Camera },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'note', label: 'Note', icon: FileText },
  { type: 'file', label: 'File', icon: File },
  { type: 'idea', label: 'Idea', icon: Lightbulb },
];

function ResurfaceCard({ item, onClick }: { item: StashItem; onClick: () => void }) {
  const mediaUrl = useItemMediaUrl(item);
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col justify-between shrink-0 w-52 h-64 snap-start overflow-hidden rounded-[1.75rem] border t-line t-fill-strong p-4 text-left transition-transform hover:scale-[1.02] focus-ring shadow-lg"
    >
      {mediaUrl ? (
        <>
          <img
            src={mediaUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover brightness-[0.65] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091718] via-transparent to-black/40" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/70 to-[#0a1819]" />
      )}

      <div className="relative z-10 flex items-center justify-between w-full">
        <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium t-ink-soft">
          {formatAge(item.createdAt)}
        </span>
        {item.favorite && <Star size={14} className="fill-[var(--stash-accent)] text-[var(--stash-accent)]" />}
      </div>

      <div className="relative z-10 mt-auto">
        <strong className="block text-sm font-bold text-white line-clamp-2 leading-snug">
          {item.title}
        </strong>
        {item.description && (
          <p className="mt-1 text-xs t-ink-soft line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-teal-300 uppercase tracking-wider font-semibold">
            {item.type}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-teal-300 backdrop-blur-sm">
            <ItemTypeIcon type={item.type} size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

export function HomeScreen({ onCapture }: { onCapture: (type: StashItemType) => void }) {
  const { items, collections, navigate, setTypeFilter } = useStashStore();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const active = items.filter((item) => !item.deletedAt && !item.archived);
  const resurfaced = rankForResurface(active, Date.now(), 6);
  const inboxUnsorted = active.filter((item) => !item.collectionId).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Unsorted', count: inboxUnsorted, icon: Layers, filter: 'all' },
    { label: 'Links', count: active.filter((i) => i.type === 'link').length, icon: Link2, filter: 'link' },
    { label: 'Notes', count: active.filter((i) => i.type === 'note').length, icon: FileText, filter: 'note' },
    { label: 'Files', count: active.filter((i) => i.type === 'file').length, icon: File, filter: 'file' },
  ];

  return (
    <div className="screen-stack space-y-6">
      <div>
        <h1 className="home-greeting text-foreground">{greeting}</h1>
        <p className="page-subtitle">Your space for what matters.</p>
      </div>

      {/* Quick Capture Card (Stash 3) */}
      <Surface className="capture-card rounded-[2rem] border t-line t-fill p-5 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="capture-spark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--stash-accent)]/15 text-[var(--stash-accent)] border border-[var(--stash-accent)]/30">
              <Sparkles size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">What should we remember?</h2>
              <p className="text-xs text-muted-foreground truncate">Screenshot, link, note, file, idea…</p>
            </div>
          </div>
          <button
            onClick={() => onCapture('screenshot')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--stash-accent)] text-[var(--t-accent-ink)] shadow-lg shadow-[var(--stash-accent)]/30 hover:scale-105 active:scale-95 transition-transform focus-ring font-medium text-2xl"
            aria-label="Add item"
          >
            +
          </button>
        </div>

        <div className="quick-grid grid grid-cols-5 gap-2 mt-4 pt-3 border-t t-line">
          {quickTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => onCapture(type)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border t-line t-fill py-2 px-1 text-xs text-muted-foreground transition-all t-fill-hover hover:text-foreground focus-ring"
            >
              <Icon size={17} className="text-[var(--stash-accent)]" />
              <span className="text-[11px] truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </Surface>

      {/* Inbox Category Cards (Stash 3) */}
      <section>
        <div className="section-heading flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Inbox</h2>
          <button
            onClick={() => {
              setTypeFilter('all');
              navigate('inbox');
            }}
            className="flex items-center gap-1 text-sm font-medium text-[var(--stash-accent)] hover:underline"
          >
            View all <ChevronRight size={16} />
          </button>
        </div>

        <div className="stat-grid grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => {
                  setTypeFilter(stat.filter);
                  navigate('inbox');
                }}
                className="flex flex-col items-start justify-between rounded-2xl border t-line t-fill p-4 text-left transition-all t-fill-hover focus-ring"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)] mb-3">
                  <Icon size={18} />
                </span>
                <strong className="text-2xl font-bold text-foreground">{stat.count}</strong>
                <span className="text-xs text-muted-foreground mt-0.5">{stat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Remember Today (Stash 3) */}
      <section>
        <div className="section-heading flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Remember Today</h2>
          <button
            onClick={() => setReviewModalOpen(true)}
            className="text-sm font-medium text-[var(--stash-accent)] hover:underline"
          >
            Edit
          </button>
        </div>

        <button
          type="button"
          onClick={() => setReviewModalOpen(true)}
          className="w-full flex items-center justify-between rounded-2xl border t-line t-fill p-4 transition-all t-fill-hover focus-ring text-left"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Check size={20} />
            </span>
            <div>
              <strong className="block text-sm font-semibold text-foreground">Review your {active.length} saved item{active.length === 1 ? '' : 's'}</strong>
              <p className="text-xs text-muted-foreground mt-0.5">Deterministic resurfacing brings your best finds back</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resurfaced.slice(0, 3).map((item) => (
              <ItemThumbnail key={item.id} item={item} size="sm" />
            ))}
            {resurfaced.length > 3 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-900/80 text-[10px] font-bold text-teal-200 border border-black">
                +{resurfaced.length - 3}
              </span>
            )}
            <ChevronRight size={18} className="text-muted-foreground ml-1" />
          </div>
        </button>
      </section>

      {/* Resurfaced Cards Carousel (Stash 3) */}
      <section>
        <div className="section-heading flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Resurfaced</h2>
          <button onClick={() => navigate('resurface')} className="text-sm font-medium text-[var(--stash-accent)] hover:underline">
            See all
          </button>
        </div>

        <div className="resurface-grid flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {resurfaced.map((item) => (
            <ResurfaceCard key={item.id} item={item} onClick={() => navigate('detail', item.id)} />
          ))}
        </div>
      </section>

      {/* Collections (Stash 3) */}
      <section>
        <div className="section-heading flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Collections</h2>
          <button onClick={() => navigate('collections')} className="text-sm font-medium text-[var(--stash-accent)] hover:underline">
            View all
          </button>
        </div>

        <div className="collection-strip flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {collections.map((collection) => {
            const count = active.filter((item) => item.collectionId === collection.id).length;
            const iconSymbol =
              collection.id === 'inspiration' ? '✦' :
              collection.id === 'work' ? '💼' :
              collection.id === 'recipes' ? '🍃' :
              collection.id === 'study' ? '🎓' : '📁';

            return (
              <button
                key={collection.id}
                onClick={() => navigate('collection', collection.id)}
                className="flex items-center gap-3 shrink-0 rounded-2xl border t-line t-fill px-4 py-3 text-left transition-all t-fill-hover focus-ring min-w-[11rem]"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                  style={{ backgroundColor: `${collection.color}25`, color: collection.color }}
                >
                  {iconSymbol}
                </span>
                <div>
                  <strong className="block text-sm font-semibold text-foreground truncate">{collection.name}</strong>
                  <small className="text-xs text-muted-foreground">{count} item{count === 1 ? '' : 's'}</small>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recently Saved List (Stash 3) */}
      <section>
        <div className="section-heading flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Recently saved</h2>
          <button
            onClick={() => {
              setTypeFilter('all');
              navigate('inbox');
            }}
            className="text-sm font-medium text-[var(--stash-accent)] hover:underline"
          >
            See all
          </button>
        </div>

        <Surface className="rounded-2xl border t-line t-fill divide-y divide-[color:var(--t-line-soft)] overflow-hidden">
          {active
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 4)
            .map((item) => (
              <ItemRow item={item} key={item.id} />
            ))}
        </Surface>
      </section>

      {/* Remember Today Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border t-line stash-dialog p-6 shadow-2xl backdrop-blur-3xl sm:max-w-lg text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                <Check size={16} />
              </span>
              Remember Today — Daily Review
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review your top active items to keep ideas fresh in mind.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {active.slice(0, 5).map((item, idx) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setReviewModalOpen(false);
                  navigate('detail', item.id);
                }}
                className="w-full text-left flex items-center gap-3 rounded-xl border t-line t-fill p-3 cursor-pointer t-fill-hover transition-colors"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full t-fill-strong text-xs text-muted-foreground font-mono">
                  {idx + 1}
                </span>
                <ItemThumbnail item={item} size="sm" />
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium text-foreground truncate">{item.title}</strong>
                  <p className="text-xs text-muted-foreground truncate">{item.description || formatItemMetadata(item)}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="w-full rounded-full bg-[var(--stash-accent)] py-2.5 text-sm font-semibold text-[var(--t-accent-ink)] hover:brightness-105"
            >
              Completed for Today
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ListMode = 'inbox' | 'search' | 'favorites' | 'archive' | 'trash' | 'reminders' | 'resurface';

const listCopy: Record<ListMode, { title: string; subtitle: string }> = {
  inbox: { title: 'Inbox', subtitle: 'All your saved items in one place.' },
  search: { title: 'Search', subtitle: 'Find what you need, fast.' },
  favorites: { title: 'Favorites', subtitle: 'The keepers you marked for easy return.' },
  archive: { title: 'Archive', subtitle: 'Out of the way, never out of reach.' },
  trash: { title: 'Trash', subtitle: 'Restore items or remove them permanently.' },
  reminders: { title: 'Reminders', subtitle: 'Small nudges for things worth returning to.' },
  resurface: { title: 'Resurface', subtitle: 'Useful things you may have forgotten.' },
};

export function ListScreen({ mode }: { mode: ListMode }) {
  const {
    items,
    collections,
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    sort,
    setSort,
    layoutMode,
    setLayoutMode,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useStashStore();

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  let visible = mode === 'trash' ? items.filter((item) => item.deletedAt) : items.filter((item) => !item.deletedAt);
  if (mode === 'inbox' || mode === 'search') visible = visible.filter((item) => !item.archived);
  if (mode === 'favorites') visible = visible.filter((item) => item.favorite && !item.archived);
  if (mode === 'archive') visible = visible.filter((item) => item.archived);
  if (mode === 'reminders') visible = visible.filter((item) => item.reminderAt && !item.archived);
  if (mode === 'resurface') visible = rankForResurface(visible.filter((item) => !item.archived), Date.now(), 40);

  visible = searchItems(visible, collections, query);
  if (typeFilter !== 'all') {
    if (typeFilter === 'screenshot') {
      visible = visible.filter((item) => item.type === 'screenshot' || item.type === 'image');
    } else {
      visible = visible.filter((item) => item.type === typeFilter);
    }
  }

  if (mode !== 'resurface') {
    visible.sort((a, b) =>
      sort === 'oldest' ? a.createdAt - b.createdAt :
      sort === 'title' ? a.title.localeCompare(b.title) :
      b.createdAt - a.createdAt
    );
  }

  const smartFilters = [
    { type: 'note', label: 'Notes', count: items.filter((i) => i.type === 'note').length, icon: FileText },
    { type: 'link', label: 'Links', count: items.filter((i) => i.type === 'link').length, icon: Link2 },
    { type: 'file', label: 'Files', count: items.filter((i) => i.type === 'file').length, icon: File },
    { type: 'screenshot', label: 'Screenshots', count: items.filter((i) => i.type === 'screenshot' || i.type === 'image').length, icon: Camera },
    { type: 'idea', label: 'Ideas', count: items.filter((i) => i.type === 'idea').length, icon: Lightbulb },
  ];

  return (
    <div className="screen-stack space-y-5">
      <PageHeader eyebrow="STASH" title={listCopy[mode].title} />
      <p className="page-subtitle">{listCopy[mode].subtitle}</p>

      {/* Search Input Bar (Stash 1 & Stash 4) */}
      {(mode === 'search' || mode === 'inbox') && (
        <div className="search-box relative flex items-center rounded-2xl border t-line t-fill px-4 py-3 backdrop-blur-xl shadow-inner">
          <Search size={19} className="text-muted-foreground shrink-0 mr-3" />
          <input
            aria-label="Search items"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                addRecentSearch(query);
              }
            }}
            placeholder={mode === 'search' ? 'Search your STASH' : 'Search your inbox…'}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-base"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground mr-2"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--stash-accent)]/15 text-[var(--stash-accent)] hover:bg-[var(--stash-accent)]/25 focus-ring"
            aria-label="Filter options"
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>
      )}

      {/* Filter Pill Row (Stash 1) */}
      {mode === 'inbox' && (
        <div className="filter-row flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Item filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'screenshot', label: 'Screenshots' },
            { id: 'link', label: 'Links' },
            { id: 'note', label: 'Notes' },
            { id: 'file', label: 'Files' },
            { id: 'idea', label: 'Ideas' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setTypeFilter(filter.id)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all focus-ring',
                typeFilter === filter.id
                  ? 'bg-[var(--stash-accent)] text-[var(--t-accent-ink)] shadow-md'
                  : 't-fill text-muted-foreground border t-line t-fill-hover hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Stash 4 Search Extras: Recent Searches & Smart Filters (shown when query is empty or in search mode) */}
      {mode === 'search' && !query && (
        <div className="space-y-5">
          {/* Recent Searches Chips (Stash 4) */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-foreground">Recent searches</h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs font-medium text-[var(--stash-accent)] hover:underline"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setQuery(term);
                      addRecentSearch(term);
                    }}
                    className="flex items-center gap-1.5 rounded-full border t-line t-fill px-3 py-1.5 text-xs text-muted-foreground t-fill-hover hover:text-foreground focus-ring"
                  >
                    <Clock size={13} className="text-muted-foreground/70" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Smart Filters (Stash 4) */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-foreground">Smart filters</h3>
              <button
                onClick={() => setTypeFilter('all')}
                className="text-xs font-medium text-[var(--stash-accent)] hover:underline"
              >
                View all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {smartFilters.map((sf) => {
                const Icon = sf.icon;
                return (
                  <button
                    key={sf.type}
                    onClick={() => setTypeFilter(sf.type)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-3 text-left transition-all focus-ring',
                      typeFilter === sf.type
                        ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/15 text-[var(--stash-accent)]'
                        : 't-line t-fill t-fill-hover text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[var(--stash-accent)]" />
                      <span className="text-xs font-medium">{sf.label}</span>
                    </div>
                    <span className="rounded-md t-fill-hover px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                      {sf.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Meta Bar: Count, Sort dropdown & Grid/List Toggle (Stash 1 & Stash 4) */}
      <div className="list-meta flex items-center justify-between text-xs text-muted-foreground pt-1 border-t t-line">
        <span className="font-medium text-foreground/80">{visible.length} items</span>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-transparent text-[var(--stash-accent)] font-medium focus:outline-none cursor-pointer"
            >
              <option value="newest" className="stash-menu text-white">Newest first</option>
              <option value="oldest" className="stash-menu text-white">Oldest first</option>
              <option value="title" className="stash-menu text-white">Best match</option>
            </select>
          </label>

          {mode === 'inbox' && (
            <div className="flex items-center border t-line rounded-lg p-0.5 t-fill">
              <button
                onClick={() => setLayoutMode('list')}
                className={cn('p-1 rounded', layoutMode === 'list' ? 't-fill-hover text-white' : 'text-muted-foreground')}
                aria-label="List layout"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setLayoutMode('grid')}
                className={cn('p-1 rounded', layoutMode === 'grid' ? 't-fill-hover text-white' : 'text-muted-foreground')}
                aria-label="Grid layout"
              >
                <Grid size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Items View (List or Grid) */}
      {visible.length ? (
        layoutMode === 'grid' && mode === 'inbox' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visible.map((item) => (
              <ItemGridCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <Surface className="rounded-2xl border t-line t-fill divide-y divide-[color:var(--t-line-soft)] overflow-hidden">
            {visible.map((item) => (
              <ItemRow item={item} key={item.id} />
            ))}
          </Surface>
        )
      ) : (
        <EmptyState
          icon={mode === 'trash' ? Trash2 : Search}
          title={query ? 'Nothing matched' : 'Nothing here yet'}
          body={query ? `No items matched “${query}”. Try another keyword or reset filters.` : 'Saved items will appear here.'}
          action={
            query ? (
              <button
                onClick={() => {
                  setQuery('');
                  setTypeFilter('all');
                }}
                className="mt-2 text-xs font-semibold text-[var(--stash-accent)] hover:underline"
              >
                Reset search & filters
              </button>
            ) : undefined
          }
        />
      )}

      {/* Filter Drawer Dialog */}
      <Dialog open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DialogContent className="rounded-[2rem] border t-line stash-dialog p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[var(--stash-accent)]" />
              Filter & Sort STASH
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Type
              </span>
              <div className="grid grid-cols-3 gap-2">
                {['all', 'screenshot', 'link', 'note', 'file', 'idea'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      'rounded-xl border p-2 text-xs font-medium capitalize focus-ring',
                      typeFilter === t
                        ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/15 text-[var(--stash-accent)]'
                        : 't-line t-fill-strong text-muted-foreground'
                    )}
                  >
                    {t === 'all' ? 'All types' : t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Sort Order
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'newest', label: 'Newest' },
                  { id: 'oldest', label: 'Oldest' },
                  { id: 'title', label: 'A to Z' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id as typeof sort)}
                    className={cn(
                      'rounded-xl border p-2 text-xs font-medium focus-ring',
                      sort === s.id
                        ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/15 text-[var(--stash-accent)]'
                        : 't-line t-fill-strong text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setFilterDrawerOpen(false)}
            className="w-full rounded-full bg-[var(--stash-accent)] py-2.5 text-sm font-semibold text-[var(--t-accent-ink)]"
          >
            Apply Filters
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CollectionsScreen() {
  const { collections, items, navigate, createCollection } = useStashStore();
  const [name, setName] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createCollection(name);
    setName('');
  };

  return (
    <div className="screen-stack space-y-5">
      <PageHeader eyebrow="ORGANIZE" title="Collections" />
      <p className="page-subtitle">Loose enough for capture. Structured when it helps.</p>

      <form className="new-collection flex items-center gap-2 rounded-2xl border t-line t-fill p-2" onSubmit={submit}>
        <FolderPlus size={18} className="ml-2 text-[var(--stash-accent)] shrink-0" />
        <input
          aria-label="New collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Create a new collection…"
          className="w-full bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-[var(--stash-accent)] px-4 py-2 text-xs font-semibold text-[var(--t-accent-ink)] shrink-0 focus-ring">
          Create
        </button>
      </form>

      <div className="collection-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
        {collections.map((collection) => {
          const count = items.filter((item) => item.collectionId === collection.id && !item.deletedAt).length;
          const iconSymbol =
            collection.id === 'inspiration' ? '✦' :
            collection.id === 'work' ? '💼' :
            collection.id === 'recipes' ? '🍃' :
            collection.id === 'study' ? '🎓' : '📁';

          return (
            <button
              key={collection.id}
              onClick={() => navigate('collection', collection.id)}
              className="flex items-center justify-between rounded-2xl border t-line t-fill p-4 text-left transition-all t-fill-hover focus-ring"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
                  style={{ backgroundColor: `${collection.color}25`, color: collection.color }}
                >
                  {iconSymbol}
                </span>
                <div className="min-w-0">
                  <strong className="block text-base font-semibold text-foreground truncate">{collection.name}</strong>
                  <small className="text-xs text-muted-foreground">{count} saved items</small>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CollectionScreen({ id }: { id?: string }) {
  const { collections, items, navigate } = useStashStore();
  const collection = collections.find((entry) => entry.id === id);

  if (!collection) {
    return <EmptyState title="Collection not found" body="It may have been removed or renamed." />;
  }

  const visible = items.filter((item) => item.collectionId === collection.id && !item.deletedAt);

  return (
    <div className="screen-stack space-y-4">
      <PageHeader back={() => navigate('collections')} eyebrow="COLLECTION" title={collection.name} />
      <p className="page-subtitle">{visible.length} saved items</p>

      {visible.length ? (
        <Surface className="rounded-2xl border t-line t-fill divide-y divide-[color:var(--t-line-soft)] overflow-hidden">
          {visible.map((item) => (
            <ItemRow item={item} key={item.id} />
          ))}
        </Surface>
      ) : (
        <EmptyState
          title="A fresh collection"
          body="Save something new and choose this collection when saving to file it here."
        />
      )}
    </div>
  );
}

export function DetailScreen({ id }: { id?: string }) {
  const { items, collections, navigate, toggleItem, archiveItem, trashItem, updateItem } = useStashStore();
  const item = items.find((entry) => entry.id === id);
  const collection = collections.find((entry) => entry.id === item?.collectionId);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');

  const mediaUrl = useItemMediaUrl(item);

  useEffect(() => {
    if (item) {
      setNotesText(item.notes || '');
      setReminderDate(
        item.reminderAt
          ? new Date(item.reminderAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : ''
      );
    }
  }, [item]);

  if (!item) {
    return <EmptyState title="Item not found" body="It may have been permanently removed." />;
  }

  const saveNotes = async () => {
    await updateItem(item.id, { notes: notesText });
    setIsEditingNotes(false);
  };

  const handleAddTag = async () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (trimmed && !item.tags.includes(trimmed)) {
      await updateItem(item.id, { tags: [...item.tags, trimmed] });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleSaveReminder = async () => {
    const time = reminderDate ? new Date(reminderDate).getTime() : undefined;
    await updateItem(item.id, { reminderAt: time });
    setReminderDialogOpen(false);
  };

  return (
    <div className="screen-stack detail-screen space-y-5 pb-8">
      {/* Top Header Controls (Stash 5) */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => navigate('inbox')}
          className="icon-button focus-ring flex h-10 w-10 items-center justify-center rounded-full border t-line t-fill-strong t-fill-hover"
          aria-label="Back to inbox"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleItem(item.id, 'pinned')}
            className={cn(
              'icon-button focus-ring flex h-10 w-10 items-center justify-center rounded-full border transition-all',
              item.pinned
                ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/20 text-[var(--stash-accent)]'
                : 't-line t-fill-strong text-muted-foreground t-fill-hover'
            )}
            title="Pin item"
            aria-label="Pin item"
          >
            <Pin size={17} className={item.pinned ? 'fill-[var(--stash-accent)]' : ''} />
          </button>

          <button
            onClick={() => toggleItem(item.id, 'favorite')}
            className={cn(
              'icon-button focus-ring flex h-10 w-10 items-center justify-center rounded-full border transition-all',
              item.favorite
                ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/20 text-[var(--stash-accent)]'
                : 't-line t-fill-strong text-muted-foreground t-fill-hover'
            )}
            title="Favorite item"
            aria-label="Favorite item"
          >
            <Heart size={17} className={item.favorite ? 'fill-[var(--stash-accent)]' : ''} />
          </button>

          <button
            onClick={() => archiveItem(item.id)}
            className="icon-button focus-ring flex h-10 w-10 items-center justify-center rounded-full border t-line t-fill-strong text-muted-foreground t-fill-hover"
            title="Archive item"
            aria-label="Archive item"
          >
            <Archive size={17} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="icon-button focus-ring flex h-10 w-10 items-center justify-center rounded-full border t-line t-fill-strong text-muted-foreground t-fill-hover"
                  aria-label="More options"
                />
              }
            >
              <MoreHorizontal size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 stash-menu t-line backdrop-blur-xl">
              <DropdownMenuItem
                onClick={() => {
                  if (item.url) void navigator.clipboard.writeText(item.url);
                }}
                className="cursor-pointer"
              >
                <Share2 size={15} className="mr-2" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('edit', item.id)} className="cursor-pointer">
                <FileText size={15} className="mr-2" />
                Edit metadata
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => trashItem(item.id)} className="cursor-pointer text-red-400">
                <Trash2 size={15} className="mr-2" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero Media Card (Stash 5) */}
      <div className="relative overflow-hidden rounded-[2rem] border t-line bg-neutral-900 shadow-2xl">
        {mediaUrl ? (
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <img src={mediaUrl} alt={item.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
          </div>
        ) : (
          <div className="flex h-52 w-full flex-col items-center justify-center bg-gradient-to-br from-teal-950/40 to-[#071415] p-6 text-center">
            <ItemTypeIcon type={item.type} size={36} />
            <span className="mt-3 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              {item.type}
            </span>
          </div>
        )}

        {/* Top Badges (Stash 5) */}
        <div className="absolute top-4 left-4 z-10">
          {collection && <CollectionPill collection={collection} />}
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {item.imageCount && (
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {item.imageCount} images
            </span>
          )}
        </div>

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--stash-accent)] text-[var(--t-accent-ink)] shadow-lg hover:scale-105 transition-transform"
            aria-label="Open link in new tab"
          >
            <ExternalLink size={17} />
          </a>
        )}
      </div>

      {/* Title & Description (Stash 5) */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{item.title}</h1>
        {item.description && (
          <p className="mt-2 text-base text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      {/* Link Row (Stash 5) */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm font-medium text-[var(--stash-accent)] hover:underline break-all"
        >
          <Link2 size={16} className="shrink-0" />
          <span>{item.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
          <ExternalLink size={13} className="shrink-0" />
        </a>
      )}

      {/* Notes Card with Inline Editing (Stash 5) */}
      <Surface className="rounded-2xl border t-line t-fill p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">Notes</h2>
          {!isEditingNotes ? (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="text-xs font-semibold text-[var(--stash-accent)] hover:underline"
            >
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingNotes(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="text-xs font-semibold text-[var(--stash-accent)] hover:underline"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {isEditingNotes ? (
          <textarea
            rows={4}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
            placeholder="Write your notes here…"
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {item.notes || 'No notes added yet. Tap Edit to add context.'}
          </p>
        )}
      </Surface>

      {/* Tags Row with Add Button (Stash 5) */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tags</h2>
        <div className="flex flex-wrap items-center gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border t-line t-fill-strong px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}

          {isAddingTag ? (
            <div className="flex items-center gap-1.5">
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="tag"
                className="rounded-full border border-[var(--stash-accent)] bg-black/40 px-3 py-1 text-xs text-white focus:outline-none w-24"
              />
              <button
                onClick={handleAddTag}
                className="rounded-full bg-[var(--stash-accent)] px-2 py-1 text-[11px] font-bold text-[var(--t-accent-ink)]"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingTag(false)}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full border t-line t-fill-strong text-muted-foreground hover:text-foreground focus-ring"
              aria-label="Add tag"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Collection Card (Stash 5) */}
      {collection && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Collection</h2>
          <button
            onClick={() => navigate('collection', collection.id)}
            className="flex w-full items-center justify-between rounded-2xl border t-line t-fill p-3 text-left t-fill-hover transition-colors focus-ring"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <Sparkles size={18} />
              </div>
              <div>
                <strong className="block text-sm font-semibold text-foreground">{collection.name}</strong>
                <small className="text-xs text-muted-foreground">View collection items</small>
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--stash-accent)]">View &gt;</span>
          </button>
        </section>
      )}

      {/* Reminder Card (Stash 5) */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Reminder</h2>
        <div className="flex items-center justify-between rounded-2xl border t-line t-fill p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
              <Bell size={18} />
            </div>
            <div>
              <strong className="block text-sm font-medium text-foreground">
                {item.reminderAt
                  ? `Review on ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(item.reminderAt)}`
                  : 'No reminder scheduled'}
              </strong>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.reminderAt ? 'You’ll see it in Reminders' : 'Schedule an in-app review nudge'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReminderDialogOpen(true)}
            className="text-xs font-semibold text-[var(--stash-accent)] hover:underline"
          >
            Change
          </button>
        </div>
      </section>

      {/* Metadata Card (Stash 5) */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border t-line t-fill p-4 text-xs">
        <div>
          <span className="text-muted-foreground block mb-1">Created</span>
          <p className="font-semibold text-foreground">
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(item.createdAt)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground block mb-1">Saved via</span>
          <p className="font-semibold text-[var(--stash-accent)] flex items-center gap-1">
            <Sparkles size={12} />
            {item.source || 'STASH Clipper'}
          </p>
        </div>
      </div>

      {/* Bottom Action Bar (Stash 5) */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => trashItem(item.id)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors focus-ring"
          aria-label="Move to trash"
        >
          <Trash2 size={18} />
        </button>

        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[var(--stash-accent)] py-3 text-sm font-bold text-[var(--t-accent-ink)] shadow-lg shadow-[var(--stash-accent)]/20 hover:brightness-105 transition-all focus-ring"
          >
            Open Link <ExternalLink size={16} />
          </a>
        ) : (
          <button
            onClick={() => navigate('edit', item.id)}
            className="flex-1 rounded-full bg-[var(--stash-accent)] py-3 text-sm font-bold text-[var(--t-accent-ink)] shadow-lg shadow-[var(--stash-accent)]/20 hover:brightness-105 transition-all focus-ring"
          >
            Edit Item
          </button>
        )}

        <button
          onClick={() => navigate('edit', item.id)}
          className="flex h-12 px-5 items-center justify-center gap-1.5 rounded-full border t-line t-fill-strong text-sm font-semibold text-foreground t-fill-hover transition-colors focus-ring"
        >
          Edit
        </button>
      </div>

      {/* Reminder Picker Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="rounded-[2rem] border t-line stash-dialog p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Bell size={18} className="text-[var(--stash-accent)]" />
              Schedule Reminder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                Date & Time
              </span>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full rounded-xl border t-line t-fill-strong px-3 py-2 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
                  tomorrow.setHours(9, 0, 0, 0);
                  setReminderDate(new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                }}
                className="rounded-lg border t-line t-fill-strong px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Tomorrow 9 AM
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  nextWeek.setHours(9, 0, 0, 0);
                  setReminderDate(new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                }}
                className="rounded-lg border t-line t-fill-strong px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Next week
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {item.reminderAt && (
              <button
                onClick={() => {
                  void updateItem(item.id, { reminderAt: undefined });
                  setReminderDialogOpen(false);
                }}
                className="flex-1 rounded-full border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-semibold text-red-400"
              >
                Clear Reminder
              </button>
            )}
            <button
              onClick={handleSaveReminder}
              className="flex-1 rounded-full bg-[var(--stash-accent)] py-2.5 text-xs font-semibold text-[var(--t-accent-ink)]"
            >
              Save Reminder
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EditScreen({ id }: { id?: string }) {
  const { items, collections, updateItem, navigate } = useStashStore();
  const item = items.find((entry) => entry.id === id);

  const [form, setForm] = useState(() => ({
    title: item?.title ?? '',
    description: item?.description ?? '',
    notes: item?.notes ?? '',
    url: item?.url ?? '',
    tags: item?.tags.join(', ') ?? '',
    collectionId: item?.collectionId ?? '',
    reminder: item?.reminderAt
      ? new Date(item.reminderAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : '',
  }));

  if (!item) {
    return <EmptyState title="Item not found" body="It may have been removed." />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await updateItem(item.id, {
      title: form.title,
      description: form.description,
      notes: form.notes,
      url: form.url || undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
      collectionId: form.collectionId || undefined,
      reminderAt: form.reminder ? new Date(form.reminder).getTime() : undefined,
    });
    navigate('detail', item.id);
  };

  return (
    <div className="screen-stack space-y-4">
      <PageHeader back={() => navigate('detail', item.id)} eyebrow="EDIT ITEM" title={item.title} />

      <form onSubmit={submit} className="edit-form space-y-4">
        <label className="field">
          <span className="text-xs font-semibold text-muted-foreground">Title</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
          />
        </label>

        <label className="field">
          <span className="text-xs font-semibold text-muted-foreground">Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
          />
        </label>

        <label className="field">
          <span className="text-xs font-semibold text-muted-foreground">Notes</span>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
          />
        </label>

        <label className="field">
          <span className="text-xs font-semibold text-muted-foreground">URL</span>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">
            <span className="text-xs font-semibold text-muted-foreground">Tags</span>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
            />
          </label>

          <label className="field">
            <span className="text-xs font-semibold text-muted-foreground">Collection</span>
            <select
              value={form.collectionId}
              onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
              className="w-full rounded-xl border t-line bg-[#0a1819] p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
            >
              <option value="">Inbox</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="text-xs font-semibold text-muted-foreground">Reminder</span>
          <input
            type="datetime-local"
            value={form.reminder}
            onChange={(e) => setForm({ ...form, reminder: e.target.value })}
            className="w-full rounded-xl border t-line t-fill-strong p-3 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none"
          />
        </label>

        <button type="submit" className="w-full rounded-full bg-[var(--stash-accent)] py-3 font-semibold text-[var(--t-accent-ink)] focus-ring">
          Save changes
        </button>
      </form>
    </div>
  );
}

export function SettingsScreen() {
  const { navigate, resetToSample } = useStashStore();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  return (
    <div className="screen-stack space-y-6">
      <PageHeader eyebrow="STASH" title="Settings" />
      <p className="page-subtitle">Customize your experience.</p>

      {/* Local-First / Privacy Hero Banner (Stash 6) */}
      <Surface className="rounded-[2rem] border t-line t-fill p-5 backdrop-blur-2xl shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[var(--stash-accent)] mb-2">
              <ShieldCheck size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">No account required</span>
            </div>
            <h2 className="text-lg font-bold text-foreground">Private by default, stored locally</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              STASH has no accounts, subscriptions, or cloud backend. Everything you save lives on this device in
              IndexedDB.
            </p>
            <button
              onClick={() => setPrivacyModalOpen(true)}
              className="mt-3 inline-block text-xs font-semibold text-[var(--stash-accent)] hover:underline"
            >
              Learn more &gt;
            </button>
          </div>

          <div className="shrink-0 w-24 h-24 hidden sm:block">
            <img src="/assets/safe_vault.jpg" alt="Local-only vault" className="w-full h-full object-cover rounded-2xl border t-line" />
          </div>
        </div>
      </Surface>

      {/* Preferences Section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Preferences</h2>
        <Surface className="rounded-2xl border t-line t-fill divide-y divide-[color:var(--t-line-soft)] overflow-hidden">
          <button onClick={() => navigate('appearance')} className="settings-row w-full flex items-center justify-between p-4 hover:t-fill transition-colors text-left focus-ring">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
                <Palette size={18} />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-foreground">Appearance</strong>
                <small className="text-xs text-muted-foreground">Dark mode, accents, and live previews</small>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>

          <button onClick={() => navigate('backup')} className="settings-row w-full flex items-center justify-between p-4 hover:t-fill transition-colors text-left focus-ring">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
                <FileArchive size={18} />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-foreground">Storage & Backup</strong>
                <small className="text-xs text-muted-foreground">Local usage • Export and import your data</small>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>

          <button onClick={() => navigate('reminders')} className="settings-row w-full flex items-center justify-between p-4 hover:t-fill transition-colors text-left focus-ring">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
                <Bell size={18} />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-foreground">Reminders</strong>
                <small className="text-xs text-muted-foreground">In-app review nudges for saved items</small>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>

          <button onClick={() => navigate('install')} className="settings-row w-full flex items-center justify-between p-4 hover:t-fill transition-colors text-left focus-ring">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
                <Laptop size={18} />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-foreground">Install STASH on Devices</strong>
                <small className="text-xs text-muted-foreground">macOS, iOS, Android, and Windows</small>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>

          <button onClick={() => navigate('about')} className="settings-row w-full flex items-center justify-between p-4 hover:t-fill transition-colors text-left focus-ring">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
                <Info size={18} />
              </span>
              <div>
                <strong className="block text-sm font-semibold text-foreground">About STASH</strong>
                <small className="text-xs text-muted-foreground">Version {STASH_CONFIG.app.version.name} • Support • Updates</small>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </Surface>
      </section>

      {/* Support STASH — external links only, no in-app payments. */}
      <SupportSection />

      {/* Reset Sample Data Button */}
      <div className="pt-2">
        <button
          onClick={() => setResetConfirmOpen(true)}
          className="w-full rounded-2xl border t-line t-fill p-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:t-fill-strong transition-colors"
        >
          Restore Original Sample Data
        </button>
      </div>

      {/* Privacy Explanation Modal */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="rounded-[2rem] border t-line stash-dialog p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-[var(--stash-accent)]" />
              Private by Default
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground py-2 leading-relaxed">
            <p>
              STASH uses local-first architecture. When you save a link, screenshot, note, or file, it is written directly to your device’s sandboxed <strong>IndexedDB database</strong>.
            </p>
            <p>
              There are no external analytics, no advertising trackers, and no background cloud servers scraping your content.
            </p>
            <p>
              You own your data completely. You can export a full portable JSON backup at any time from <strong>Storage & Backup</strong>.
            </p>
          </div>
          <button
            onClick={() => setPrivacyModalOpen(false)}
            className="w-full rounded-full bg-[var(--stash-accent)] py-2.5 text-xs font-semibold text-[var(--t-accent-ink)]"
          >
            Understood
          </button>
        </DialogContent>
      </Dialog>

      {/* Reset Sample Confirmation Modal */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="rounded-[2rem] border t-line stash-dialog p-6 shadow-2xl backdrop-blur-3xl sm:max-w-md text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Restore Sample Content?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will refresh your local STASH database with the reference sample photography, collections, and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setResetConfirmOpen(false)}
              className="flex-1 rounded-full border t-line t-fill-strong py-2.5 text-xs font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await resetToSample();
                setResetConfirmOpen(false);
              }}
              className="flex-1 rounded-full bg-[var(--stash-accent)] py-2.5 text-xs font-semibold text-[var(--t-accent-ink)]"
            >
              Restore Now
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Appearance — theme browser
//
// One card per theme. The card's preview is a miniature of the REAL app
// chrome built from the same design tokens: the wrapper carries
// `data-theme="<id variants…>"`, which scopes every [data-theme] rule in
// globals.css to the card. So previews are honest at all times — a theme
// that is *not* applied renders exactly as it would applied. Tapping applies
// instantly (store → CSS attribute swap, no remount) and persists the id to
// IndexedDB + the localStorage pre-paint mirror.
// ─────────────────────────────────────────────────────────────────────────

function ThemeMiniPreview({ theme }: { theme: StashTheme }) {
  return (
    <span className="theme-mini" data-theme={theme.cssAttr} aria-hidden>
      <span className="theme-mini-top">
        <span>S T A S H</span>
        <em>{theme.scheme === 'dark' ? 'Dark' : 'Light'}</em>
      </span>
      <span className="theme-mini-hero">
        <strong className="theme-mini-h">Good evening</strong>
        <span className="theme-mini-line">
          <i />
          <i />
        </span>
      </span>
      <span className="theme-mini-row">
        <span className="theme-mini-tile">
          <ImageIcon size={12} />
        </span>
        <span className="theme-mini-lines">
          <i />
          <i />
        </span>
        <span className="theme-mini-btn">SAVE</span>
      </span>
      <span className="theme-mini-nav">
        <i className="is-active">
          <Home size={10} />
        </i>
        <i>
          <Search size={10} />
        </i>
        <i />
        <i>
          <SlidersHorizontal size={10} />
        </i>
        <i>
          <Palette size={10} />
        </i>
        <span className="theme-mini-fab">
          <Plus size={9} />
        </span>
      </span>
    </span>
  );
}

export function AppearanceScreen() {
  const { settings, updateSettings, navigate } = useStashStore();

  return (
    <div className="screen-stack space-y-6">
      <PageHeader back={() => navigate('settings')} eyebrow="STASH" title="Appearance" />
      <p className="page-subtitle">
        Ten built looks, one STASH. Tap a card to apply it instantly — the choice is stored on this device and
        survives restarts, in the PWA and the Android app alike.
      </p>

      <section aria-label="Theme gallery" className="theme-gallery">
        {STASH_THEMES.map((theme) => {
          const selected = settings.themeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              data-testid={`theme-card-${theme.id}`}
              aria-pressed={selected}
              onClick={() => void updateSettings({ themeId: theme.id })}
              className={cn('theme-card focus-ring', selected && 'is-selected')}
            >
              {selected && (
                <span className="theme-card-check" aria-hidden>
                  <Check size={12} />
                </span>
              )}
              <ThemeMiniPreview theme={theme} />
              <span className="theme-card-meta">
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
                <span className="theme-card-tags">
                  <em>{theme.scheme === 'dark' ? 'Dark' : 'Light'}</em>
                  <em>{theme.typeLabel}</em>
                  {selected && <em className="is-on">Applied</em>}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <Surface className="rounded-2xl border t-line t-fill p-4">
        <p className="text-xs t-ink-soft leading-relaxed">
          Themes retune typography, surfaces, radii, borders, glass, backgrounds, shadows, navigation, buttons,
          spacing, icon tiles and decorative details — the layout and your data stay identical under every look.
        </p>
      </Surface>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function BackupScreen() {
  const { items, load, navigate } = useStashStore();
  const [status, setStatus] = useState('');
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [storageUnsupported, setStorageUnsupported] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [requestingPersist, setRequestingPersist] = useState(false);

  // Real browser storage estimation. Never hard-code a quota.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setStorageUnsupported(true);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      navigator.storage
        .estimate()
        .then((estimate) => {
          if (cancelled) return;
          setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
        })
        .catch(() => {
          if (!cancelled) setStorageUnsupported(true);
        });
    };
    refresh();
    const onPersistGranted = () => refresh();
    window.addEventListener('stash:persistence-granted', onPersistGranted);
    return () => {
      cancelled = true;
      window.removeEventListener('stash:persistence-granted', onPersistGranted);
    };
  }, []);

  // iOS PWA: ask once whether the storage is marked persistent. If the
  // browser supports the Storage API but the storage is not persistent,
  // we show a banner with a "Request persistent storage" action.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return;
    let cancelled = false;
    navigator.storage.persisted().then(
      (p) => {
        if (!cancelled) setPersisted(p);
      },
      () => {
        // Storage API may reject in private modes; treat as unknown.
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestPersist = async () => {
    if (requestingPersist) return;
    setRequestingPersist(true);
    try {
      const { requestPersist } = await import('@/lib/stash/persistence');
      const granted = await requestPersist();
      setPersisted(granted);
    } finally {
      setRequestingPersist(false);
    }
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      await importBackup(file);
      await load();
      setStatus('Backup imported successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const handleImport = async () => {
    const file = await pickFile();
    if (file) await onImport(file);
  };

  const usagePercent = storage && storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;
  const showPersistBanner = persisted === false && !storageUnsupported;

  return (
    <div className="screen-stack space-y-5">
      <PageHeader back={() => navigate('settings')} eyebrow="SETTINGS" title="Storage & Backup" />

      {/* iOS PWA: persistent-storage banner. Only renders when the
       *  browser supports the Storage API but the storage is not
       *  marked persistent. iOS Safari will usually auto-grant; the
       *  button is provided as a backup. */}
      {showPersistBanner && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-100">
          <ShieldCheck size={20} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">Protect your data on this device</strong>
            <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
              Some browsers may evict website data under storage pressure. Asking once for persistent storage prevents that.
            </p>
            <button
              onClick={handleRequestPersist}
              disabled={requestingPersist}
              className="mt-2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-50 focus-ring"
            >
              {requestingPersist ? 'Requesting…' : 'Request persistent storage'}
            </button>
          </div>
        </div>
      )}

      {/* Storage Gauge Card */}
      <Surface className="rounded-2xl border t-line t-fill p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <strong className="text-base font-bold text-foreground">Storage Usage</strong>
            <p className="text-xs text-muted-foreground mt-0.5">
              {items.length} item{items.length === 1 ? '' : 's'} saved locally in IndexedDB
              {persisted === true && (
                <>
                  {' · '}
                  <span className="text-[var(--stash-accent)]">Persistent</span>
                </>
              )}
            </p>
          </div>
          {storage ? (
            <span className="text-sm font-semibold text-[var(--stash-accent)]">
              {formatBytes(storage.usage)} of {formatBytes(storage.quota)}
            </span>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              {storageUnsupported ? 'Estimate unavailable' : 'Estimating…'}
            </span>
          )}
        </div>

        {storage ? (
          <progress
            value={Math.round(usagePercent)}
            max={100}
            className="storage-meter w-full"
            aria-label="Browser storage used"
          >
            {Math.round(usagePercent)}%
          </progress>
        ) : (
          <p className="text-xs text-muted-foreground">
            {storageUnsupported
              ? 'This browser does not expose the Storage API, so the quota cannot be measured here.'
              : 'Calculating your browser storage quota…'}
          </p>
        )}
      </Surface>

      {/* Export & Import Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={exportBackup}
          className="flex flex-col items-start gap-2 rounded-2xl border t-line t-fill p-5 text-left transition-all t-fill-hover focus-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 mb-1">
            <Download size={20} />
          </span>
          <strong className="text-base font-semibold text-foreground">Export Backup</strong>
          <span className="text-xs text-muted-foreground">
            Download a portable JSON archive including attached media files.
          </span>
        </button>

        <button
          onClick={handleImport}
          className="flex flex-col items-start gap-2 rounded-2xl border t-line t-fill p-5 text-left transition-all t-fill-hover focus-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 mb-1">
            <Upload size={20} />
          </span>
          <strong className="text-base font-semibold text-foreground">Import Backup</strong>
          <span className="text-xs text-muted-foreground">
            Restore items, collections, and media from a previously exported file.
          </span>
        </button>
      </div>

      {status && <div className="rounded-xl bg-teal-500/20 p-3 text-xs font-medium text-teal-200">{status}</div>}

      <div className="rounded-2xl border t-line t-fill p-4 flex items-center gap-3 text-xs text-muted-foreground">
        <ShieldCheck size={20} className="text-[var(--stash-accent)] shrink-0" />
        <p>Backups are manual — there is no automatic cloud backup. They are unencrypted JSON; keep them somewhere you trust.</p>
      </div>
    </div>
  );
}

export function InstallScreen() {
  const navigate = useStashStore((state) => state.navigate);

  return (
    <div className="screen-stack space-y-5">
      <PageHeader back={() => navigate('settings')} eyebrow="PWA" title="Install STASH" />
      <p className="page-subtitle">A faster, full-screen home for everything you save.</p>

      <Surface className="rounded-2xl border t-line t-fill p-5 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--stash-accent)]/20 text-[var(--stash-accent)] shrink-0">
            <Sparkles size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">STASH for Desktop & Mobile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zero network latency. Works offline anywhere after the first visit.
            </p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('stash-install-request'))}
            className="rounded-full bg-[var(--stash-accent)] px-5 py-2.5 text-xs font-bold text-[var(--t-accent-ink)] hover:brightness-105 shrink-0 focus-ring"
          >
            Install App
          </button>
        </div>
      </Surface>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Surface className="rounded-2xl border t-line t-fill p-4 space-y-1.5">
          <strong className="text-sm font-semibold text-foreground block">iPhone & iPad</strong>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In Safari, tap the <span className="font-semibold text-foreground">Share</span> icon, then choose <span className="font-semibold text-foreground">“Add to Home Screen”</span>.
          </p>
        </Surface>

        <Surface className="rounded-2xl border t-line t-fill p-4 space-y-1.5">
          <strong className="text-sm font-semibold text-foreground block">Android</strong>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Open Chrome menu (three dots) and tap <span className="font-semibold text-foreground">“Install app”</span> or <span className="font-semibold text-foreground">“Add to Home screen”</span>.
          </p>
        </Surface>

        <Surface className="rounded-2xl border t-line t-fill p-4 space-y-1.5">
          <strong className="text-sm font-semibold text-foreground block">Mac & Windows</strong>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Click the install badge in the browser address bar or use the Install App button above.
          </p>
        </Surface>
      </div>
    </div>
  );
}

export function AboutScreen() {
  const navigate = useStashStore((state) => state.navigate);

  return (
    <div className="screen-stack space-y-5">
      <PageHeader back={() => navigate('settings')} eyebrow="STASH" title="About" />

      <Surface className="about-card stash-surface">
        <span className="app-icon overflow-hidden">
          <img src="/icon.svg" alt="" className="h-full w-full" />
        </span>
        <h2>Save now. Find it when it matters.</h2>
        <p>
          STASH is a private, local-first memory space for the useful things that usually disappear across tabs,
          screenshots, files, and notes. Ten themes, one app — on Android, iPhone (Safari PWA) and the web.
        </p>
        <span className="t-label">{bundledVersionLabel()}</span>
      </Surface>

      <div className="space-y-2 rounded-2xl border t-line t-fill p-4">
        {[
          'Private by default — no mandatory accounts',
          'IndexedDB local persistence in browser',
          'Deterministic resurfacing algorithm',
          'Offline Progressive Web App support',
          'Full portable JSON backup import & export',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2.5 text-xs t-ink-soft">
            <Check size={14} className="text-[var(--stash-accent)] shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Support STASH (Ko-fi primary + Share) */}
      <SupportSection withHeading />

      {/* Android APK updater (Settings/About → Check for updates) */}
      <AndroidUpdateSection />

      <div className="space-y-2">
        <Link href="/privacy" className="flex items-center justify-between rounded-2xl border t-line t-fill p-4 hover:bg-[var(--t-overlay-hover)] transition-colors">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-[var(--stash-accent)]" />
            <div>
              <strong className="block text-sm font-semibold text-foreground">Privacy Policy</strong>
              <small className="text-xs t-ink-soft">Zero-telemetry local data handling</small>
            </div>
          </div>
          <ChevronRight size={18} className="t-ink-soft" />
        </Link>

        <Link href="/changelog" className="flex items-center justify-between rounded-2xl border t-line t-fill p-4 hover:bg-[var(--t-overlay-hover)] transition-colors">
          <div className="flex items-center gap-3">
            <CircleHelp size={18} className="text-[var(--stash-accent)]" />
            <div>
              <strong className="block text-sm font-semibold text-foreground">Changelog</strong>
              <small className="text-xs t-ink-soft">Recent improvements and updates</small>
            </div>
          </div>
          <ChevronRight size={18} className="t-ink-soft" />
        </Link>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Support STASH — external links only (Ko-fi is the primary option). There
 * is deliberately NO in-app payment processing anywhere in this section.
 * The Ko-fi URL lives in one place: lib/stash/config.ts.
 * ────────────────────────────────────────────────────────────────────────── */
export function SupportSection({ withHeading = false }: { withHeading?: boolean }) {
  const [shareNote, setShareNote] = useState<string>();

  return (
    <section>
      {withHeading && (
        <h2 className="text-xs font-bold uppercase tracking-wider t-ink-soft mb-3">Support STASH</h2>
      )}
      <Surface className="rounded-2xl border t-line overflow-hidden divide-y divide-[color:var(--t-line-soft)]">
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
            <Coffee size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold text-foreground">Buy us a coffee</strong>
            <small className="block text-xs t-ink-soft mt-0.5 leading-relaxed">
              STASH is free and ad-free forever. Ko-fi keeps the lights on — links out, never charges inside the app.
            </small>
          </div>
          <button
            type="button"
            onClick={() => openExternal(STASH_CONFIG.support.kofiUrl)}
            className="primary-button focus-ring shrink-0 !min-h-10 !px-4 !text-xs"
          >
            <ExternalLink size={14} />
            Ko-fi
          </button>
        </div>

        <div className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
            <Share2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold text-foreground">Share STASH</strong>
            <small className="block text-xs t-ink-soft mt-0.5">
              {shareNote ?? 'Tell a friend — uses the native share sheet where available.'}
            </small>
          </div>
          <button
            type="button"
            onClick={async () => {
              await shareItem(STASH_CONFIG.support.shareTitle, STASH_CONFIG.support.shareText, resolveShareUrl());
              setShareNote('Thanks for spreading the word!');
              window.setTimeout(() => setShareNote(undefined), 2500);
            }}
            className="secondary-button focus-ring shrink-0 !min-h-10 !px-4 !text-xs"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </Surface>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Android update channel — Settings/About → Check for updates.
 *
 * Flow: fetch the tiny remote version.json (URL in lib/stash/config.ts),
 * compare with the *installed* build via @capacitor/app, and offer
 * "Download update" which opens the APK externally. Installing the newer APK
 * over the existing one is safe *because* the package id (com.stash.app) and
 * signing key never change — Android keeps app data across same-signature
 * upgrades, so IndexedDB storage survives.
 *
 * On web / PWA this section explains the update prompt instead: the service
 * worker surfaces "Update available / Refresh now" automatically.
 * ────────────────────────────────────────────────────────────────────────── */
export function AndroidUpdateSection() {
  const isNativeAndroid = platform === 'capacitor';
  const [installed, setInstalled] = useState<string>(STASH_CONFIG.app.version.name);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheckResult | undefined>();

  useEffect(() => {
    void readInstalledBuild().then((build) => setInstalled(build.versionName));
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setResult(undefined);
    setResult(await checkForAndroidUpdate());
    setChecking(false);
  };

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wider t-ink-soft mb-3">Updates</h2>
      <Surface className="rounded-2xl border t-line p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl t-fill-strong text-[var(--stash-accent)]">
            <RefreshCw size={18} className={checking ? 'animate-spin' : undefined} />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold text-foreground">
              {isNativeAndroid ? 'Check for updates' : 'Android &amp; PWA updates'}
            </strong>
            <small className="block text-xs t-ink-soft mt-0.5">
              {isNativeAndroid
                ? `Installed version ${installed}. Compares against the latest release list.`
                : 'On web / iPhone PWA, new versions arrive with the “Update available” prompt — tap Refresh now.'}
            </small>
          </div>
          {isNativeAndroid && (
            <button
              type="button"
              disabled={checking}
              onClick={() => void runCheck()}
              className="secondary-button focus-ring shrink-0 !min-h-10 !px-4 !text-xs disabled:opacity-60"
            >
              {checking ? 'Checking…' : 'Check now'}
            </button>
          )}
        </div>

        {result?.status === 'up-to-date' && (
          <p className="mt-3 rounded-xl bg-[var(--t-overlay)] px-3 py-2.5 text-xs t-ink-soft leading-relaxed">
            You are up to date — version {installed} is the latest release.
          </p>
        )}

        {result?.status === 'unreachable' && (
          <p className="mt-3 rounded-xl bg-[var(--t-overlay)] px-3 py-2.5 text-xs text-amber-400 leading-relaxed">
            {result.error}
          </p>
        )}

        {result?.status === 'available' && (
          <div className="mt-3 rounded-xl border t-line p-3 space-y-2" data-testid="update-result">
            <div className="flex items-center justify-between text-xs">
              <span className="t-ink-soft">Current</span>
              <strong className="text-foreground">{installed}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="t-ink-soft">Latest</span>
              <strong className="text-[var(--stash-accent)]">
                {result.latest.versionName}
                {result.latest.releasedAt ? ` · ${result.latest.releasedAt.slice(0, 10)}` : ''}
              </strong>
            </div>
            {result.latest.notes && (
              <p className="text-xs t-ink-soft leading-relaxed whitespace-pre-line border-t pt-2 mt-2 border-[color:var(--t-line-soft)]">
                {result.latest.notes}
              </p>
            )}
            <button
              type="button"
              onClick={() => openExternal(result.latest.url)}
              className="primary-button focus-ring w-full !min-h-11 text-sm"
            >
              <Download size={15} />
              Download update
            </button>
            <p className="text-[10px] t-ink-soft leading-relaxed">
              Android installs the APK itself. Same package (com.stash.app) and same signing key mean the new
              version installs <em>over</em> this one — your saved items stay intact. No uninstall needed.
            </p>
          </div>
        )}
      </Surface>
    </section>
  );
}
