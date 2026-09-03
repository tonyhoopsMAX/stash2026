'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, Bell, Boxes, Clock3, File, FileText, Heart, Home, Image, Inbox, Link2, Plus, Search, Settings, Sparkles, Trash2, WifiOff, X } from 'lucide-react';
import { CaptureDialog } from './CaptureDialog';
import { AboutScreen, AppearanceScreen, BackupScreen, CollectionScreen, CollectionsScreen, DetailScreen, EditScreen, HomeScreen, InstallScreen, ListScreen, SettingsScreen } from './screens';
import { cn } from './ui';
import { useStashStore } from '@/lib/stash/store';
import type { AppView, StashItemType } from '@/lib/stash/types';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations?: object; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const primaryNav: Array<{ view: AppView; label: string; icon: typeof Home }> = [
  { view: 'home', label: 'Home', icon: Home }, { view: 'inbox', label: 'Inbox', icon: Inbox }, { view: 'search', label: 'Search', icon: Search }, { view: 'collections', label: 'Collections', icon: Boxes }, { view: 'settings', label: 'Settings', icon: Settings },
];
const libraryNav: Array<{ view: AppView; label: string; icon: typeof Home }> = [
  { view: 'resurface', label: 'Resurface', icon: Sparkles }, { view: 'reminders', label: 'Reminders', icon: Clock3 }, { view: 'favorites', label: 'Favorites', icon: Heart }, { view: 'archive', label: 'Archive', icon: Archive }, { view: 'trash', label: 'Trash', icon: Trash2 },
];
const addChoices: Array<{ type: StashItemType; label: string; icon: typeof File }> = [
  { type: 'screenshot', label: 'Screenshot', icon: Image }, { type: 'image', label: 'Photo', icon: Image }, { type: 'link', label: 'Link', icon: Link2 }, { type: 'note', label: 'Note', icon: FileText }, { type: 'file', label: 'File', icon: File },
];
const accentValues = { jade: ['#25dac5','37 218 197'], ocean: ['#318cf4','49 140 244'], orchid: ['#a452df','164 82 223'], sunset: ['#ff7a45','255 122 69'], mono: ['#8d9898','141 152 152'] } as const;

export function AppShell() {
  const store = useStashStore();
  const { ready, view, activeId, settings, load, navigate, setAddOpen, addOpen } = store;
  const [splash, setSplash] = useState(true);
  const [captureType, setCaptureType] = useState<StashItemType>('note');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<{ prompt: () => Promise<void> }>();

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const initialView = params.get('view') as AppView | null;
    if (initialView) useStashStore.setState({ view: initialView, activeId: params.get('id') ?? undefined });
    const timer = window.setTimeout(() => setSplash(false), 650);
    const syncOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', syncOnline); window.addEventListener('offline', syncOnline); syncOnline();
    return () => { clearTimeout(timer); window.removeEventListener('online', syncOnline); window.removeEventListener('offline', syncOnline); };
  }, [load]);

  useEffect(() => { if (ready && !settings.onboardingComplete) setOnboarding(true); }, [ready, settings.onboardingComplete]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && systemDark));
    const [hex, rgb] = accentValues[settings.accent];
    root.style.setProperty('--stash-accent', hex); root.style.setProperty('--stash-accent-rgb', rgb);
  }, [settings]);

  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setDeferredInstall(event as Event & { prompt: () => Promise<void> }); };
    const requestInstall = () => { if (deferredInstall) void deferredInstall.prompt(); else alert('Use your browser menu and choose “Install app” or “Add to Home Screen.”'); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('stash-install-request', requestInstall);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('stash-install-request', requestInstall); };
  }, [deferredInstall]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'create_stash_note', title: 'Create STASH note', description: 'Save a new text note locally in STASH.',
        inputSchema: { type: 'object', properties: { title: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['title'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { title?: unknown; notes?: unknown; tags?: unknown };
          if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('title must be a non-empty string');
          if (value.notes !== undefined && typeof value.notes !== 'string') throw new Error('notes must be a string');
          if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string'))) throw new Error('tags must be an array of strings');
          const item = await useStashStore.getState().createItem({ type: 'note', title: value.title, notes: value.notes as string | undefined, tags: value.tags as string[] | undefined });
          return { id: item.id, title: item.title, saved: true };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
      void Promise.resolve(context.registerTool({
        name: 'search_stash', title: 'Search STASH', description: 'Search local saved items by title, notes, description, tags, URLs, and collection.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          const value = input as { query?: unknown }; if (typeof value.query !== 'string') throw new Error('query must be a string');
          const needle = value.query.trim().toLowerCase();
          return useStashStore.getState().items.filter((item) => !item.deletedAt && [item.title,item.description,item.notes,item.url ?? '',...item.tags].join(' ').toLowerCase().includes(needle)).slice(0,10).map(({id,title,type}) => ({id,title,type}));
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* Unsupported experimental API. */ }
    return () => lifecycle.abort();
  }, []);

  const openCapture = (type: StashItemType) => { setCaptureType(type); setCaptureOpen(true); setAddOpen(false); };
  const screen = (() => {
    switch (view) {
      case 'home': return <HomeScreen onCapture={openCapture} />;
      case 'inbox': case 'search': case 'favorites': case 'archive': case 'trash': case 'reminders': case 'resurface': return <ListScreen mode={view} />;
      case 'collections': return <CollectionsScreen />;
      case 'collection': return <CollectionScreen id={activeId} />;
      case 'detail': return <DetailScreen id={activeId} />;
      case 'edit': return <EditScreen id={activeId} />;
      case 'settings': return <SettingsScreen />;
      case 'appearance': return <AppearanceScreen />;
      case 'backup': return <BackupScreen />;
      case 'install': return <InstallScreen />;
      case 'about': return <AboutScreen />;
      default: return <HomeScreen onCapture={openCapture} />;
    }
  })();

  if (splash || !ready) return <main className="splash-screen"><motion.div initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} className="splash-mark"><Sparkles /></motion.div><motion.span initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.18}}>STASH</motion.span><p>Your space for what matters.</p></main>;

  return <main className="app-root">
    <aside className="desktop-sidebar">
      <button onClick={() => navigate('home')} className="brand-button focus-ring"><span><Sparkles /></span><strong>STASH</strong></button>
      <nav aria-label="App navigation">{primaryNav.map(({view:itemView,label,icon:Icon}) => <button key={itemView} onClick={() => navigate(itemView)} className={cn('side-nav-item focus-ring',view===itemView&&'is-active')}><Icon/><span>{label}</span></button>)}</nav>
      <div className="side-label">Library</div><nav aria-label="Library navigation">{libraryNav.map(({view:itemView,label,icon:Icon}) => <button key={itemView} onClick={() => navigate(itemView)} className={cn('side-nav-item focus-ring',view===itemView&&'is-active')}><Icon/><span>{label}</span></button>)}</nav>
      <div className="local-pill"><span className={online?'online-dot':'offline-dot'}/><span><strong>{online?'Local & ready':'Offline mode'}</strong><small>Your data stays here</small></span></div>
    </aside>
    <div className="app-stage">
      <div className="app-topbar"><span>{online ? 'Stored locally' : <><WifiOff/> Working offline</>}</span><button onClick={() => navigate('reminders')} className="icon-button focus-ring" aria-label="Reminders"><Bell/></button></div>
      <div className="app-content">{screen}</div>
      <AnimatePresence>{addOpen && <motion.div className="fab-menu" initial={{opacity:0,y:18,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:.92}} transition={{type:'spring',stiffness:370,damping:27}}>{addChoices.map(({type,label,icon:Icon},index)=><motion.button initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:index*.035}} key={type} onClick={()=>openCapture(type)} className="fab-option focus-ring"><span>{label}</span><i><Icon/></i></motion.button>)}</motion.div>}</AnimatePresence>
      <button onClick={()=>setAddOpen(!addOpen)} className={cn('floating-add focus-ring',addOpen&&'is-open')} aria-label={addOpen?'Close add menu':'Add item'}>{addOpen?<X/>:<Plus/>}</button>
      <nav className="bottom-nav" aria-label="Primary navigation">{primaryNav.filter((item)=>item.view!=='collections').map(({view:itemView,label,icon:Icon})=><button key={itemView} onClick={()=>navigate(itemView)} className={cn('bottom-nav-item focus-ring',view===itemView&&'is-active')}><Icon/><span>{label}</span></button>)}</nav>
    </div>
    <CaptureDialog open={captureOpen} initialType={captureType} onClose={()=>setCaptureOpen(false)} />
    <AnimatePresence>{onboarding && <motion.div className="onboarding-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><motion.section initial={{opacity:0,y:24,scale:.96}} animate={{opacity:1,y:0,scale:1}} className="onboarding-card"><span className="app-icon"><Sparkles/></span><p className="eyebrow">WELCOME TO STASH</p><h1>Remember more.<br/>Organize less.</h1><p>Save the useful things that usually disappear across screenshots, tabs, notes, and files. Everything stays on this device.</p><div className="onboarding-points"><span><ShieldIcon/>Private by default</span><span><WifiOff/>Works offline</span><span><Search/>Fast local search</span></div><button className="primary-button focus-ring" onClick={async()=>{await store.updateSettings({onboardingComplete:true});setOnboarding(false);}}>Enter your STASH</button></motion.section></motion.div>}</AnimatePresence>
  </main>;
}

function ShieldIcon(){ return <span aria-hidden>◈</span>; }
