import Link from 'next/link';
import { ArrowLeft, Layers3 } from 'lucide-react';
import type { ReactNode } from 'react';

export function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <main className="min-h-screen px-5 py-5 sm:px-8"><nav className="mx-auto flex max-w-5xl items-center justify-between py-3"><Link href="/" className="focus-ring flex items-center gap-3 rounded-full"><span className="grid size-10 place-items-center rounded-[15px] bg-teal-500 text-white"><Layers3 size={19}/></span><strong className="text-sm tracking-[.32em]">STASH</strong></Link><Link href="/app" className="focus-ring rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">Open STASH</Link></nav><article className="mx-auto max-w-3xl py-20"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16}/>Back home</Link><p className="eyebrow">{eyebrow}</p><h1 className="mt-5 text-balance text-5xl font-semibold tracking-[-.055em] sm:text-7xl">{title}</h1><p className="mt-7 text-xl leading-8 text-muted-foreground">{intro}</p><div className="prose-stash mt-14">{children}</div></article></main>;
}
