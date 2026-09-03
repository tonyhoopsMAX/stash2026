import Link from 'next/link';
import { ArrowRight, Bookmark, Boxes, CloudOff, Download, Layers3, LockKeyhole, Search, Sparkles, Zap } from 'lucide-react';

const cards = [
  { icon: Sparkles, title: 'Cabin design inspiration', meta: 'Image · just now', tone: 'from-cyan-400/35 to-emerald-900/55' },
  { icon: Bookmark, title: 'Client feedback — Q2', meta: 'Note · 18m ago', tone: 'from-amber-300/25 to-orange-950/45' },
  { icon: Search, title: 'Tokyo travel guide', meta: 'Link · 3h ago', tone: 'from-sky-300/30 to-indigo-950/50' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden px-5 pb-8 pt-5 sm:px-8 lg:px-12">
      <nav className="mx-auto flex max-w-7xl items-center justify-between py-3" aria-label="Main navigation">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-full" aria-label="STASH home">
          <span className="grid size-10 place-items-center rounded-[15px] bg-teal-500 text-white shadow-lg shadow-teal-500/20"><Layers3 size={20} /></span>
          <span className="text-sm font-semibold tracking-[0.35em]">STASH</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/privacy" className="focus-ring hidden rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Privacy</Link>
          <Link href="/app" className="focus-ring rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-lg">Open STASH</Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-14 py-14 lg:grid-cols-[1.02fr_.98fr] lg:py-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
            <LockKeyhole size={15} className="text-teal-500" /> Private by default. Useful by design.
          </div>
          <h1 className="text-balance text-[clamp(3.4rem,8vw,7.4rem)] font-semibold leading-[.89] tracking-[-.065em]">Save now.<br /><span className="text-teal-500">Find it</span> when<br />it matters.</h1>
          <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Screenshots, links, notes, files, and ideas—kept together on your device and ready to resurface at the right moment.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/app" className="focus-ring group inline-flex min-h-12 items-center gap-3 rounded-full bg-teal-500 px-6 font-semibold text-white shadow-xl shadow-teal-500/20">Start stashing <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></Link>
            <Link href="#how-it-works" className="focus-ring inline-flex min-h-12 items-center rounded-full border bg-card/55 px-6 font-medium backdrop-blur-xl">See how it works</Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">No account. No subscription. Works offline.</p>
        </div>

        <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
          <div className="absolute inset-10 rounded-full bg-teal-400/25 blur-[85px]" />
          <div className="glass relative rounded-[3.4rem] p-3 shadow-2xl">
            <div className="rounded-[2.8rem] bg-[#071415] p-5 text-white sm:p-7">
              <div className="mb-9 flex items-center justify-between"><span className="text-xs font-semibold tracking-[.42em] text-teal-300">STASH</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">Local only</span></div>
              <h2 className="text-4xl font-semibold tracking-[-.04em]">Good evening</h2>
              <p className="mt-2 text-white/52">Your space for what matters.</p>
              <div className="mt-6 rounded-[2rem] border border-white/15 bg-gradient-to-br from-white/14 to-teal-400/8 p-5 shadow-[inset_0_1px_rgba(255,255,255,.18)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4"><div><p className="text-lg font-medium">What should we remember?</p><p className="mt-1 text-sm text-white/48">Screenshot, link, note, file, idea…</p></div><div className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-400 text-3xl text-[#042c29] shadow-lg shadow-teal-400/20">+</div></div>
                <div className="mt-5 grid grid-cols-5 gap-2">{['Shot','Link','Note','File','Idea'].map((item) => <span key={item} className="rounded-xl border border-white/10 bg-white/5 py-2 text-center text-[11px] text-white/65">{item}</span>)}</div>
              </div>
              <div className="mt-7 flex items-center justify-between"><h3 className="text-lg font-medium">Recently saved</h3><span className="text-sm text-teal-300">See all</span></div>
              <div className="mt-3 space-y-2">{cards.map(({icon: Icon,title,meta,tone}) => <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/9 bg-white/[.055] p-2.5"><span className={`grid size-12 place-items-center rounded-xl bg-gradient-to-br ${tone}`}><Icon size={20} /></span><span className="min-w-0"><strong className="block truncate text-sm font-medium">{title}</strong><span className="text-xs text-white/42">{meta}</span></span><span className="ml-auto text-white/35">•••</span></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl py-24">
        <div className="max-w-3xl"><p className="eyebrow">LESS ORGANIZING, MORE FINDING</p><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-.05em] sm:text-6xl">Your best finds deserve better than an open tab.</h2><p className="mt-6 text-lg leading-8 text-muted-foreground">Useful things scatter across camera rolls, browser bookmarks, messages, downloads, and half-finished notes. STASH gives them one calm, private place to land.</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {icon:Zap,title:'Capture in seconds',copy:'Save a screenshot, photo, link, note, or file without breaking your flow.'},
            {icon:Boxes,title:'Shape it later',copy:'Collections and tags are there when they help—not as a tax on every save.'},
            {icon:Search,title:'Find it fast',copy:'Offline search checks titles, notes, tags, URLs, and collection names as you type.'},
          ].map(({icon:Icon,title,copy},index)=><article key={title} className="glass rounded-[2rem] p-7"><span className="mb-12 grid size-12 place-items-center rounded-2xl bg-teal-500/15 text-teal-500"><Icon/></span><span className="text-sm text-muted-foreground">0{index+1}</span><h3 className="mt-2 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{copy}</p></article>)}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 py-16 lg:grid-cols-2">
        <article className="overflow-hidden rounded-[2.5rem] bg-[#071415] p-8 text-white sm:p-12">
          <LockKeyhole className="text-teal-300" size={30}/><p className="mt-16 text-sm font-semibold tracking-[.25em] text-teal-300">PRIVATE BY DEFAULT</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">No account.<br/>No cloud required.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-white/55">Your items live in IndexedDB on your device. STASH has no analytics profile to build and no server account to protect.</p>
          <div className="mt-10 flex flex-wrap gap-2">{['Local storage','Portable backup','No subscription'].map((item)=><span className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/65" key={item}>{item}</span>)}</div>
        </article>
        <article className="glass overflow-hidden rounded-[2.5rem] p-8 sm:p-12">
          <CloudOff className="text-teal-500" size={30}/><p className="mt-16 text-sm font-semibold tracking-[.25em] text-teal-600">READY OFFLINE</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Still yours when the signal isn’t.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">The installable app shell and saved content remain available without a connection. Search and resurfacing run locally, too.</p>
          <Link href="/install" className="mt-10 inline-flex items-center gap-2 font-semibold text-teal-600">Installation guide <ArrowRight size={18}/></Link>
        </article>
      </section>

      <section className="mx-auto max-w-5xl py-24 text-center"><Download className="mx-auto text-teal-500" size={34}/><p className="eyebrow mt-6">ONE TAP AWAY</p><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-.055em] sm:text-6xl">A home for the things<br/>you’ll want again.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Install STASH on your phone or desktop and capture ideas while they’re still fresh.</p><Link href="/app" className="focus-ring mt-9 inline-flex min-h-14 items-center gap-3 rounded-full bg-teal-500 px-8 font-semibold text-white shadow-xl shadow-teal-500/20">Open the app <ArrowRight size={18}/></Link></section>

      <section className="mx-auto max-w-4xl py-16"><p className="eyebrow">FAQ</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.05em]">Good questions.</h2><div className="mt-8 divide-y divide-border">{[
        ['Where is my data stored?','Inside this browser’s IndexedDB database on your current device. STASH does not send it to an app server.'],
        ['Can I move to another device?','Yes. Export a portable backup, move the file yourself, and import it into STASH on the other device.'],
        ['Does search use AI?','No. Version 1 uses fast deterministic local matching and a transparent resurfacing score.'],
        ['What happens if I clear browser data?','Local items can be removed with browser storage. Export backups regularly if the content matters.'],
      ].map(([question,answer])=><details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-lg font-semibold">{question}<span className="text-2xl text-teal-500 transition-transform group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-3 leading-7 text-muted-foreground">{answer}</p></details>)}</div></section>

      <footer className="mx-auto mt-20 flex max-w-7xl flex-col gap-8 border-t py-8 text-sm text-muted-foreground sm:flex-row sm:items-center"><Link href="/" className="flex items-center gap-3 text-foreground"><span className="grid size-9 place-items-center rounded-xl bg-teal-500 text-white"><Layers3 size={17}/></span><strong className="tracking-[.25em]">STASH</strong></Link><p>Save now. Find it when it matters.</p><nav className="flex flex-wrap gap-5 sm:ml-auto"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/install">Install</Link><Link href="/changelog">Changelog</Link></nav></footer>
    </main>
  );
}
