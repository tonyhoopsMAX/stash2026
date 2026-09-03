import type { StashCollection, StashItem, StashSettings } from './types';

const now = Date.now();
const ago = (hours: number) => now - hours * 60 * 60 * 1000;

export const sampleCollections: StashCollection[] = [
  { id: 'inspiration', name: 'Inspiration', icon: 'sparkles', color: '#27d8c4', createdAt: ago(240) },
  { id: 'work', name: 'Work', icon: 'briefcase', color: '#6ea8ff', createdAt: ago(220) },
  { id: 'recipes', name: 'Recipes', icon: 'leaf', color: '#7ed889', createdAt: ago(180) },
  { id: 'study', name: 'Study', icon: 'graduation', color: '#b18cff', createdAt: ago(150) },
];

export const sampleItems: StashItem[] = [
  { id: 'cabin', type: 'image', title: 'Cabin design inspiration', description: 'Warm timber, wide windows, and a quiet relationship with the landscape.', notes: 'Save the deck material and living room layout.', url: 'https://www.dezeen.com/', tags: ['architecture', 'cabin', 'minimal', 'nature'], collectionId: 'inspiration', createdAt: ago(.03), updatedAt: ago(.03), lastInteractedAt: ago(.03), reminderAt: now + 18 * 60 * 60 * 1000, pinned: true, favorite: true, archived: false },
  { id: 'tools', type: 'link', title: 'The best productivity tools in 2026', description: 'A concise roundup to revisit before the next workflow reset.', notes: '', url: 'https://www.notion.so/', tags: ['tools'], collectionId: 'work', createdAt: ago(.1), updatedAt: ago(.1), lastInteractedAt: ago(.1), pinned: false, favorite: false, archived: false },
  { id: 'feedback', type: 'note', title: 'Client feedback — Q2 notes', description: 'Clarify onboarding, reduce friction in search, and surface saved work sooner.', notes: 'Next review on Friday.', tags: ['client', 'planning'], collectionId: 'work', createdAt: ago(.3), updatedAt: ago(.3), lastInteractedAt: ago(.3), pinned: false, favorite: false, archived: false },
  { id: 'contract', type: 'file', title: 'Contract_v2.pdf', description: 'Signed project agreement and current scope.', notes: '', tags: ['documents'], collectionId: 'work', createdAt: ago(1), updatedAt: ago(1), lastInteractedAt: ago(1), fileName: 'Contract_v2.pdf', mimeType: 'application/pdf', size: 245760, pinned: false, favorite: true, archived: false },
  { id: 'skincare', type: 'image', title: 'Skincare brand ideas', description: 'Amber glass, natural materials, precise typography.', notes: '', tags: ['branding', 'packaging'], collectionId: 'inspiration', createdAt: ago(2), updatedAt: ago(2), lastInteractedAt: ago(2), pinned: false, favorite: false, archived: false },
  { id: 'tokyo', type: 'link', title: 'Tokyo travel guide', description: 'Neighborhoods, small restaurants, museums, and day trips.', notes: 'Focus on Yanaka and Kiyosumi-Shirakawa.', url: 'https://www.lonelyplanet.com/japan/tokyo', tags: ['travel', 'tokyo'], createdAt: ago(3), updatedAt: ago(3), lastInteractedAt: ago(3), pinned: false, favorite: true, archived: false },
  { id: 'meeting', type: 'note', title: 'Meeting notes — May 12', description: 'Launch checklist and ownership notes.', notes: 'Confirm the accessibility pass.', tags: ['meeting'], collectionId: 'work', createdAt: ago(5), updatedAt: ago(5), lastInteractedAt: ago(5), pinned: false, favorite: false, archived: false },
  { id: 'chair', type: 'product', title: 'Teak lounge chair', description: 'A sculptural outdoor chair worth comparing.', notes: '', url: 'https://example.com/chair', tags: ['furniture', 'outdoor'], collectionId: 'inspiration', createdAt: ago(24 * 8), updatedAt: ago(24 * 8), lastInteractedAt: ago(24 * 8), lastResurfacedAt: ago(24 * 6), pinned: false, favorite: true, archived: false },
  { id: 'bread', type: 'link', title: 'No-knead focaccia', description: 'Reliable overnight method with a crisp olive-oil crust.', notes: '', url: 'https://example.com/focaccia', tags: ['bread'], collectionId: 'recipes', createdAt: ago(24 * 20), updatedAt: ago(24 * 20), lastInteractedAt: ago(24 * 18), pinned: false, favorite: false, archived: false },
];

export const defaultSettings: StashSettings = { id: 'settings', theme: 'dark', accent: 'jade', onboardingComplete: false };
