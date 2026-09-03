import { describe, expect, it, vi } from 'vitest';
import { exportBackup, importBackup } from '../../lib/stash/backup';

vi.mock('../../lib/stash/db', () => ({
  db: {
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

  it('rejects invalid backup structure', async () => {
    const invalidFile = new File(['{"items": "not-an-array"}'], 'invalid.json', {
      type: 'application/json',
    });
    await expect(importBackup(invalidFile)).rejects.toThrow();
  });
});
