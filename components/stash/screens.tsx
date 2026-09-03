'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, Bell, Check, ChevronRight, CircleHelp, CloudOff, Download, FileArchive, FolderPlus, Heart, Info, Laptop, Moon, Palette, Pin, Search, ShieldCheck, Sparkles, Sun, Trash2, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { exportBackup, importBackup } from '@/lib/stash/backup';
import { rankForResurface } from '@/lib/stash/resurface';
import { searchItems } from '@/lib/stash/search';
import { useStashStore } from '@/lib/stash/store';
import type { StashItem, StashItemType } from '@/lib/stash/types';
import { cn, EmptyState, formatAge, ItemRow, ItemTypeIcon, Surface } from './ui';

export function PageHeader({ title, eyebrow, back, action }: { title: string; eyebrow?: string; back?: () => void; action?: ReactNode }) {
  return <header className="page-header">{back && <button onClick={back} className="icon-button focus-ring" aria-label="Go back"><ArrowLeft /></button>}<div className="min-w-0 flex-1">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{action}</header>;
}

const quickTypes: Array<{ type: StashItemType; label: string }> = [
  { type: 'screenshot', label: 'Screenshot' }, { type: 'image', label: 'Photo' }, { type: 'link', label: 'Link' }, { type: 'note', label: 'Note' }, { type: 'file', label: 'File' },
];

export function HomeScreen({ onCapture }: { onCapture: (type: StashItemType) => void }) {
  const { items, collections, navigate } = useStashStore();
  const active = items.filter((item) => !item.deletedAt && !item.archived);
  const reminders = active.filter((item) => item.reminderAt && item.reminderAt < Date.now() + 86_400_000);
  const resurfaced = rankForResurface(active, Date.now(), 4);
  const inboxCount = active.filter((item) => !item.collectionId).length;
  const stats = [{ label: 'Unsorted', count: inboxCount }, { label: 'Links', count: active.filter((i) => i.type === 'link').length }, { label: 'Notes', count: active.filter((i) => i.type === 'note').length }, { label: 'Files', count: active.filter((i) => i.type === 'file').length }];
  return <div className="screen-stack">
    <PageHeader eyebrow="STASH" title="Good evening" />
    <p className="page-subtitle">Your space for what matters.</p>
    <Surface className="capture-card">
      <div className="capture-intro"><span className="capture-spark"><Sparkles /></span><div><h2>What should we remember?</h2><p>Screenshot, link, note, file, idea…</p></div><button onClick={() => onCapture('note')} className="capture-plus focus-ring" aria-label="Add an item">+</button></div>
      <div className="quick-grid">{quickTypes.map(({ type, label }) => <button key={type} onClick={() => onCapture(type)} className="quick-action focus-ring"><ItemTypeIcon type={type} /><span>{label}</span></button>)}</div>
    </Surface>
    <section><div className="section-heading"><h2>Inbox</h2><button onClick={() => navigate('inbox')}>View all <ChevronRight /></button></div><div className="stat-grid">{stats.map((stat) => <button className="stat-card focus-ring" key={stat.label} onClick={() => navigate('inbox')}><strong>{stat.count}</strong><span>{stat.label}</span></button>)}</div></section>
    <section><div className="section-heading"><h2>Remember today</h2><button onClick={() => navigate('reminders')}>See all</button></div>{reminders.length ? reminders.slice(0, 2).map((item) => <ItemRow item={item} key={item.id} compact />) : <Surface className="reminder-strip"><span className="type-icon"><Check /></span><div><strong>You’re all caught up</strong><p>No reminders due today.</p></div></Surface>}</section>
    <section><div className="section-heading"><h2>Resurfaced</h2><button onClick={() => navigate('resurface')}>See all</button></div><div className="resurface-grid">{resurfaced.map((item, index) => <button key={item.id} onClick={() => navigate('detail', item.id)} className={cn('resurface-card focus-ring', 'resurface-tone-' + index)}><span className="resurface-age">{formatAge(item.createdAt)}</span><ItemTypeIcon type={item.type} /><strong>{item.title}</strong><span>{item.description || 'Worth another look.'}</span></button>)}</div></section>
    <section><div className="section-heading"><h2>Collections</h2><button onClick={() => navigate('collections')}>View all</button></div><div className="collection-strip">{collections.map((collection) => <button key={collection.id} onClick={() => navigate('collection', collection.id)} className="collection-chip focus-ring"><span style={{ background: collection.color }} /><strong>{collection.name}</strong><small>{active.filter((item) => item.collectionId === collection.id).length} items</small></button>)}</div></section>
    <section><div className="section-heading"><h2>Recently saved</h2><button onClick={() => navigate('inbox')}>See all</button></div><Surface className="item-list">{active.sort((a,b) => b.createdAt - a.createdAt).slice(0,4).map((item) => <ItemRow item={item} key={item.id} compact />)}</Surface></section>
  </div>;
}

type ListMode = 'inbox' | 'search' | 'favorites' | 'archive' | 'trash' | 'reminders' | 'resurface';
const listCopy: Record<ListMode, { title: string; subtitle: string }> = {
  inbox: { title: 'Inbox', subtitle: 'Everything you saved, ready when you are.' },
  search: { title: 'Search', subtitle: 'Find anything in your STASH, offline.' },
  favorites: { title: 'Favorites', subtitle: 'The keepers you marked for easy return.' },
  archive: { title: 'Archive', subtitle: 'Out of the way, never out of reach.' },
  trash: { title: 'Trash', subtitle: 'Restore items or remove them permanently.' },
  reminders: { title: 'Reminders', subtitle: 'Small nudges for things worth returning to.' },
  resurface: { title: 'Resurface', subtitle: 'Useful things you may have forgotten.' },
};

export function ListScreen({ mode }: { mode: ListMode }) {
  const { items, collections, query, setQuery, typeFilter, setTypeFilter, sort, setSort } = useStashStore();
  let visible = mode === 'trash' ? items.filter((item) => item.deletedAt) : items.filter((item) => !item.deletedAt);
  if (mode === 'inbox' || mode === 'search') visible = visible.filter((item) => !item.archived);
  if (mode === 'favorites') visible = visible.filter((item) => item.favorite && !item.archived);
  if (mode === 'archive') visible = visible.filter((item) => item.archived);
  if (mode === 'reminders') visible = visible.filter((item) => item.reminderAt && !item.archived);
  if (mode === 'resurface') visible = rankForResurface(visible.filter((item) => !item.archived), Date.now(), 40);
  visible = searchItems(visible, collections, query);
  if (typeFilter !== 'all') visible = visible.filter((item) => item.type === typeFilter);
  if (mode !== 'resurface') visible.sort((a, b) => sort === 'oldest' ? a.createdAt - b.createdAt : sort === 'title' ? a.title.localeCompare(b.title) : b.createdAt - a.createdAt);
  return <div className="screen-stack"><PageHeader eyebrow="STASH" title={listCopy[mode].title} /><p className="page-subtitle">{listCopy[mode].subtitle}</p>
    {(mode === 'search' || mode === 'inbox') && <div className="search-box"><Search /><input aria-label="Search saved items" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === 'search' ? 'Search your STASH' : 'Search your inbox…'} /></div>}
    <div className="filter-row" aria-label="Item filters">{['all','screenshot','link','note','file','image'].map((filter) => <button key={filter} onClick={() => setTypeFilter(filter)} className={cn('filter-chip focus-ring', typeFilter === filter && 'is-active')}>{filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}</button>)}</div>
    <div className="list-meta"><span>{visible.length} items</span><label>Sort <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></label></div>
    {visible.length ? <Surface className="item-list">{visible.map((item) => <ItemRow item={item} key={item.id} />)}</Surface> : <EmptyState icon={mode === 'trash' ? Trash2 : Search} title={query ? 'Nothing matched' : 'Nothing here yet'} body={query ? 'Try a different word or filter.' : 'Saved items will appear here.'} />}
  </div>;
}

export function CollectionsScreen() {
  const { collections, items, navigate, createCollection } = useStashStore();
  const [name, setName] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; await createCollection(name); setName(''); };
  return <div className="screen-stack"><PageHeader eyebrow="ORGANIZE" title="Collections" /><p className="page-subtitle">Loose enough for capture. Structured when it helps.</p>
    <form className="new-collection" onSubmit={submit}><FolderPlus /><input aria-label="New collection name" value={name} onChange={(event) => setName(event.target.value)} placeholder="New collection" /><button className="primary-button focus-ring">Create</button></form>
    <div className="collection-grid">{collections.map((collection) => <button key={collection.id} onClick={() => navigate('collection', collection.id)} className="collection-card focus-ring"><span className="collection-orb" style={{ background: collection.color }}><Sparkles /></span><strong>{collection.name}</strong><small>{items.filter((item) => item.collectionId === collection.id && !item.deletedAt).length} saved items</small><ChevronRight /></button>)}</div>
  </div>;
}

export function CollectionScreen({ id }: { id?: string }) {
  const { collections, items, navigate } = useStashStore();
  const collection = collections.find((entry) => entry.id === id);
  if (!collection) return <EmptyState title="Collection not found" body="It may have been removed." />;
  const visible = items.filter((item) => item.collectionId === collection.id && !item.deletedAt);
  return <div className="screen-stack"><PageHeader back={() => navigate('collections')} eyebrow="COLLECTION" title={collection.name} /><p className="page-subtitle">{visible.length} saved items</p>{visible.length ? <Surface className="item-list">{visible.map((item) => <ItemRow item={item} key={item.id} />)}</Surface> : <EmptyState title="A fresh collection" body="Add something and choose this collection when you save it." />}</div>;
}

function AssetPreview({ item }: { item: StashItem }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!item.blob) return; const objectUrl = URL.createObjectURL(item.blob); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [item.blob]);
  if (url && item.mimeType?.startsWith('image/')) return <img className="detail-image" src={url} alt="" />;
  return <div className={cn('detail-art', 'detail-art-' + item.type)}><ItemTypeIcon type={item.type} /><span>{item.type}</span></div>;
}

export function DetailScreen({ id }: { id?: string }) {
  const { items, collections, navigate, toggleItem, archiveItem, trashItem, updateItem } = useStashStore();
  const item = items.find((entry) => entry.id === id);
  const collection = collections.find((entry) => entry.id === item?.collectionId);
  if (!item) return <EmptyState title="Item not found" body="It may have been removed." />;
  return <div className="screen-stack detail-screen"><PageHeader back={() => navigate('inbox')} eyebrow={item.type.toUpperCase()} title={item.title} action={<div className="header-actions"><button className={cn('icon-button focus-ring', item.pinned && 'is-on')} onClick={() => toggleItem(item.id, 'pinned')} aria-label="Pin item"><Pin /></button><button className={cn('icon-button focus-ring', item.favorite && 'is-on')} onClick={() => toggleItem(item.id, 'favorite')} aria-label="Favorite item"><Heart /></button></div>} />
    <AssetPreview item={item} />
    {item.description && <p className="detail-description">{item.description}</p>}
    {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="detail-link focus-ring"><LinkIcon />{item.url.replace(/^https?:\/\//,'').replace(/\/$/,'')}</a>}
    {item.notes && <Surface className="detail-notes"><div className="section-heading"><h2>Notes</h2><button onClick={() => navigate('edit', item.id)}>Edit</button></div><p>{item.notes}</p></Surface>}
    <section><h2 className="small-heading">Tags</h2><div className="tag-row">{item.tags.length ? item.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>No tags</span>}</div></section>
    {collection && <section><h2 className="small-heading">Collection</h2><button onClick={() => navigate('collection', collection.id)} className="settings-row focus-ring"><span className="type-icon"><Sparkles /></span><span><strong>{collection.name}</strong><small>View collection</small></span><ChevronRight /></button></section>}
    <section><h2 className="small-heading">Reminder</h2><Surface className="reminder-strip"><span className="type-icon"><Bell /></span><div><strong>{item.reminderAt ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(item.reminderAt) : 'No reminder'}</strong><p>Use edit to choose a date and time.</p></div>{item.reminderAt && <button onClick={() => updateItem(item.id,{ reminderAt: undefined })}>Clear</button>}</Surface></section>
    <div className="detail-buttons"><button className="secondary-button focus-ring" onClick={() => navigate('edit', item.id)}>Edit</button>{item.url && <a className="primary-button focus-ring" href={item.url} target="_blank" rel="noreferrer">Open link</a>}{item.archived ? <button className="secondary-button focus-ring" onClick={async () => { await updateItem(item.id, { archived: false }); navigate('inbox'); }}><RotateBackIcon /> Return to inbox</button> : <button className="secondary-button focus-ring" onClick={() => archiveItem(item.id)}><Archive /> Archive</button>}<button className="danger-button focus-ring" onClick={() => trashItem(item.id)}><Trash2 /> Trash</button></div>
  </div>;
}

function LinkIcon() { return <span aria-hidden>↗</span>; }
function RotateBackIcon() { return <span aria-hidden>↩</span>; }

export function EditScreen({ id }: { id?: string }) {
  const { items, collections, updateItem, navigate } = useStashStore();
  const item = items.find((entry) => entry.id === id);
  const [form, setForm] = useState(() => ({ title: item?.title ?? '', description: item?.description ?? '', notes: item?.notes ?? '', url: item?.url ?? '', tags: item?.tags.join(', ') ?? '', collectionId: item?.collectionId ?? '', reminder: item?.reminderAt ? new Date(item.reminderAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : '' }));
  if (!item) return <EmptyState title="Item not found" body="It may have been removed." />;
  const submit = async (event: FormEvent) => { event.preventDefault(); await updateItem(item.id, { title: form.title, description: form.description, notes: form.notes, url: form.url || undefined, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), collectionId: form.collectionId || undefined, reminderAt: form.reminder ? new Date(form.reminder).getTime() : undefined }); navigate('detail', item.id); };
  return <div className="screen-stack"><PageHeader back={() => navigate('detail', item.id)} eyebrow="EDIT ITEM" title={item.title} /><form onSubmit={submit} className="edit-form"><label className="field"><span>Title</span><input value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} /></label><label className="field"><span>Description</span><textarea rows={3} value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} /></label><label className="field"><span>Notes</span><textarea rows={5} value={form.notes} onChange={(e) => setForm({...form,notes:e.target.value})} /></label><label className="field"><span>URL</span><input type="url" value={form.url} onChange={(e) => setForm({...form,url:e.target.value})} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Tags</span><input value={form.tags} onChange={(e) => setForm({...form,tags:e.target.value})} /></label><label className="field"><span>Collection</span><select value={form.collectionId} onChange={(e) => setForm({...form,collectionId:e.target.value})}><option value="">Inbox</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><label className="field"><span>Reminder</span><input type="datetime-local" value={form.reminder} onChange={(e) => setForm({...form,reminder:e.target.value})} /></label><button className="primary-button focus-ring">Save changes</button></form></div>;
}

const settingsRows = [
  { view: 'appearance', icon: Palette, title: 'Appearance', subtitle: 'Theme and accent color' },
  { view: 'backup', icon: FileArchive, title: 'Storage & Backup', subtitle: 'Export, import, and local storage' },
  { view: 'reminders', icon: Bell, title: 'Notifications', subtitle: 'Review reminders and alerts' },
  { view: 'install', icon: Laptop, title: 'Install App', subtitle: 'Add STASH to this device' },
  { view: 'about', icon: Info, title: 'About', subtitle: 'Version, privacy, and project details' },
] as const;

export function SettingsScreen() {
  const navigate = useStashStore((state) => state.navigate);
  const askNotifications = async () => { if ('Notification' in window) await Notification.requestPermission(); };
  return <div className="screen-stack"><PageHeader eyebrow="STASH" title="Settings" /><p className="page-subtitle">Make your private space feel like yours.</p>
    <Surface className="privacy-card"><span className="privacy-icon"><ShieldCheck /></span><div><h2>Your STASH stays on your device.</h2><p>No account is required. Saved data lives in this browser unless you export a backup.</p></div></Surface>
    <section><h2 className="small-heading">Preferences</h2><Surface className="settings-list">{settingsRows.map(({ view, icon: Icon, title, subtitle }) => <button key={view} onClick={() => navigate(view)} className="settings-row focus-ring"><span className="type-icon"><Icon /></span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronRight /></button>)}</Surface></section>
    <section><h2 className="small-heading">Permission</h2><button onClick={askNotifications} className="settings-row focus-ring"><span className="type-icon"><Bell /></span><span><strong>Enable notifications</strong><small>For reminder alerts when supported</small></span><ChevronRight /></button></section>
  </div>;
}

const accents = [{ id:'jade', color:'#25dac5' },{ id:'ocean',color:'#318cf4'},{id:'orchid',color:'#a452df'},{id:'sunset',color:'#ff7a45'},{id:'mono',color:'#8d9898'}] as const;

export function AppearanceScreen() {
  const { settings, updateSettings, navigate } = useStashStore();
  const dark = settings.theme === 'dark';
  return <div className="screen-stack"><PageHeader back={() => navigate('settings')} eyebrow="SETTINGS" title="Appearance" />
    <Surface className="settings-list"><div className="settings-row"><span className="type-icon">{dark ? <Moon /> : <Sun />}</span><span><strong>Dark mode</strong><small>Reduce glare and improve focus</small></span><Switch checked={dark} onCheckedChange={(checked) => updateSettings({ theme: checked ? 'dark' : 'light' })} aria-label="Dark mode" /></div></Surface>
    <section><h2 className="small-heading">Theme accent</h2><Surface className="accent-card"><p>Choose how STASH looks and feels.</p><div className="accent-grid">{accents.map((accent) => <button key={accent.id} onClick={() => updateSettings({accent:accent.id})} className={cn('accent-choice focus-ring',settings.accent===accent.id&&'is-active')}><span style={{background:accent.color}}>{settings.accent===accent.id&&<Check />}</span><small>{accent.id[0].toUpperCase()+accent.id.slice(1)}</small></button>)}</div></Surface></section>
    <section><h2 className="small-heading">Preview</h2><div className="preview-grid"><Surface><span className="eyebrow">STASH</span><h3>Good evening</h3><div className="mini-bars"><i/><i/><i/></div></Surface><Surface><h3>Cabin inspiration</h3><p>Saved for later</p><span className="tag-row"><span>#design</span></span></Surface></div></section>
  </div>;
}

export function BackupScreen() {
  const { items, load, navigate } = useStashStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const estimate = useMemo(() => items.reduce((sum,item) => sum + (item.size ?? 0), 0), [items]);
  const onImport = async (file?: File) => { if (!file) return; try { await importBackup(file); await load(); setStatus('Backup imported successfully.'); } catch (error) { setStatus(error instanceof Error ? error.message : 'Import failed.'); } };
  return <div className="screen-stack"><PageHeader back={() => navigate('settings')} eyebrow="SETTINGS" title="Storage & Backup" /><Surface className="storage-hero"><span className="privacy-icon"><CloudOff /></span><div><h2>{items.length} local items</h2><p>{estimate ? (estimate/1024/1024).toFixed(1)+' MB of attached files' : 'Your data stays in this browser.'}</p></div></Surface><div className="backup-grid"><button onClick={exportBackup} className="backup-card focus-ring"><Download /><strong>Export backup</strong><span>Download a portable JSON file, including media.</span></button><button onClick={() => inputRef.current?.click()} className="backup-card focus-ring"><Upload /><strong>Import backup</strong><span>Replace local data from a STASH export.</span></button></div><input ref={inputRef} hidden type="file" accept=".json,application/json" onChange={(event)=>onImport(event.target.files?.[0])}/>{status&&<output className="status-message">{status}</output>}<Surface className="privacy-card"><ShieldCheck/><p>Keep backups somewhere you trust. Anyone with the exported file can read its contents.</p></Surface></div>;
}

export function InstallScreen() {
  const navigate = useStashStore((state) => state.navigate);
  return <div className="screen-stack"><PageHeader back={() => navigate('settings')} eyebrow="PWA" title="Install STASH" /><p className="page-subtitle">A faster, full-screen home for everything you save.</p><Surface className="install-card"><span className="app-icon"><Sparkles /></span><div><h2>STASH for this device</h2><p>Works offline after the first visit and opens like a native app.</p></div><button className="primary-button focus-ring" onClick={() => window.dispatchEvent(new Event('stash-install-request'))}>Install app</button></Surface><div className="instruction-grid"><Surface><strong>iPhone & iPad</strong><p>In Safari, tap Share, then choose Add to Home Screen.</p></Surface><Surface><strong>Android</strong><p>Open the browser menu and choose Install app.</p></Surface><Surface><strong>Desktop</strong><p>Use the install icon in the address bar or this page’s button.</p></Surface></div></div>;
}

export function AboutScreen() {
  const navigate = useStashStore((state) => state.navigate);
  return <div className="screen-stack"><PageHeader back={() => navigate('settings')} eyebrow="STASH" title="About" /><Surface className="about-card"><span className="app-icon"><Sparkles /></span><h2>Save now. Find it when it matters.</h2><p>STASH is a private, local-first memory space for the useful things that usually disappear across tabs, screenshots, files, and notes.</p><span>Version 1.0.0 · Release candidate</span></Surface><div className="feature-checks">{['No account required','IndexedDB local storage','Deterministic resurfacing','Offline app shell','Portable backup export'].map((feature)=><div key={feature}><Check/>{feature}</div>)}</div><Link href="/privacy" className="settings-row focus-ring"><ShieldCheck/><span><strong>Privacy policy</strong><small>How local-first data handling works</small></span><ChevronRight/></Link><Link href="/changelog" className="settings-row focus-ring"><CircleHelp/><span><strong>Changelog</strong><small>What is included in this release</small></span><ChevronRight/></Link></div>;
}
