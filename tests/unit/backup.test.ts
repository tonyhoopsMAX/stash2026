/* oxlint-disable typescript/unbound-method -- assertions intentionally observe
 * the mocked Dexie store methods without calling them. */
import { describe, expect, it, vi } from 'vitest';
import { exportBackup, importBackup } from '../../lib/stash/backup';

vi.mock('../../lib/stash/db', () => ({
  db: {
    transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
      const callback = args.pop() as (tables: unknown[]) => Promise<void>;
      return callback(args);
    }),
    items: {
      toArray: vi.fn().mockResolvedValue([{ id: 'test-1', title: 'Test' }]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    collections: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    recentSearches: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

// Import the mocked module to inspect whether destructive operations ran.
const { db } = await import('../../lib/stash/db');

function validPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        type: 'note',
        title: 'A note',
        description: '',
        notes: '',
        tags: [],
        createdAt: 1,
        updatedAt: 1,
        lastInteractedAt: 1,
        pinned: false,
        favorite: false,
        archived: false,
      },
    ],
    collections: [{ id: 'col-1', name: 'Work', icon: 'folder', color: '#25dac5', createdAt: 1 }],
    settings: { id: 'settings', theme: 'dark', accent: 'jade', onboardingComplete: true },
  };
}

const makeFile = (data: unknown) =>
  new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' });

describe('backup', () => {
  it('exports valid JSON backup package', async () => {
    const file = await exportBackup();
    expect(file).toBeDefined();
    expect(file.name).toMatch(/^stash-backup-.*\.json$/);
    expect(file.type).toBe('application/json');

    const text = await file.text();
    const data = JSON.parse(text);
    expect(data.version).toBe(1);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items[0].id).toBe('test-1');
  });

  it('rejects non-JSON input', async () => {
    const invalidFile = new File(['not json'], 'invalid.json', { type: 'application/json' });
    await expect(importBackup(invalidFile)).rejects.toThrow(/not valid JSON/);
  });

  it('rejects invalid backup structure', async () => {
    const invalidFile = new File(['{"items": "not-an-array"}'], 'invalid.json', {
      type: 'application/json',
    });
    await expect(importBackup(invalidFile)).rejects.toThrow();
    expect(db.items.clear).not.toHaveBeenCalled();
    expect(db.items.bulkPut).not.toHaveBeenCalled();
  });

  it('rejects a backup with malformed items before clearing data', async () => {
    const payload = validPayload();
    (payload.items as unknown[])[0] = { id: '', type: 'nope', title: 12 };
    await expect(importBackup(makeFile(payload))).rejects.toThrow(/invalid or incomplete items/);
    expect(db.items.clear).not.toHaveBeenCalled();
    expect(db.items.bulkPut).not.toHaveBeenCalled();
  });

  it('rejects a backup with malformed settings before clearing data', async () => {
    const payload = validPayload();
    payload.settings = { id: 'settings', theme: 'neon', accent: 'jade', onboardingComplete: true } as never;
    await expect(importBackup(makeFile(payload))).rejects.toThrow(/invalid settings/);
    expect(db.items.clear).not.toHaveBeenCalled();
  });

  it('imports a well-formed backup', async () => {
    const payload = validPayload();
    await importBackup(makeFile(payload));
    expect(db.items.bulkPut).toHaveBeenCalled();
    expect(db.collections.bulkPut).toHaveBeenCalled();
    expect(db.settings.put).toHaveBeenCalled();
  });
});
