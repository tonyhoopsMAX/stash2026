import type { Metadata } from 'next';
import { AppShell } from '@/components/stash/AppShell';

export const metadata: Metadata = { title: 'Your STASH', description: 'Your private, local-first saved space.' };

export default function StashAppPage() { return <AppShell />; }
