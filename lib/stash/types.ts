export type StashItemType = 'screenshot' | 'image' | 'link' | 'note' | 'file' | 'product' | 'idea' | 'place' | 'movie' | 'study';
export type AppView = 'home' | 'inbox' | 'add' | 'detail' | 'edit' | 'collections' | 'collection' | 'search' | 'resurface' | 'reminders' | 'archive' | 'favorites' | 'trash' | 'settings' | 'appearance' | 'backup' | 'install' | 'about';

export interface StashItem {
  id: string;
  type: StashItemType;
  title: string;
  description: string;
  notes: string;
  url?: string;
  tags: string[];
  collectionId?: string;
  createdAt: number;
  updatedAt: number;
  lastInteractedAt: number;
  lastResurfacedAt?: number;
  reminderAt?: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  deletedAt?: number;
  mimeType?: string;
  fileName?: string;
  size?: number;
  blob?: Blob;
  imageUrl?: string;
  source?: string;
  imageCount?: number;
}

export interface StashCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface StashSettings {
  id: 'settings';
  /** Legacy light/dark flag — superseded by `themeId`, kept so older rows
   *  still parse. The active theme's own `scheme` wins at render time. */
  theme: 'light' | 'dark' | 'system';
  /** Legacy accent choice, kept for data compatibility. The selected theme
   *  fully controls the accent since the v1 theme system. */
  accent: 'jade' | 'ocean' | 'orchid' | 'sunset' | 'mono';
  /** Selected theme from lib/stash/themes.ts (10 launch themes). */
  themeId: import('./themes').ThemeId;
  onboardingComplete: boolean;
}

export interface CreateItemInput {
  type: StashItemType;
  title: string;
  description?: string;
  notes?: string;
  url?: string;
  tags?: string[];
  collectionId?: string;
  reminderAt?: number;
  blob?: Blob;
  fileName?: string;
  mimeType?: string;
  size?: number;
  imageUrl?: string;
  source?: string;
}
