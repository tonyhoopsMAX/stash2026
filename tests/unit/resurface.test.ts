import { describe, expect, it } from 'vitest';
import { rankForResurface, resurfacingScore } from '../../lib/stash/resurface';
import type { StashItem } from '../../lib/stash/types';

const now = new Date('2026-09-03T12:00:00Z').getTime();
const base: StashItem = { id:'base',type:'note',title:'Base',description:'',notes:'',tags:[],createdAt:now-10*86_400_000,updatedAt:now-10*86_400_000,lastInteractedAt:now-10*86_400_000,pinned:false,favorite:false,archived:false };

describe('resurfacing', () => {
  it('boosts important and due items', () => {
    expect(resurfacingScore({...base,id:'important',favorite:true,pinned:true,reminderAt:now+3_600_000},now)).toBeGreaterThan(resurfacingScore(base,now));
  });
  it('excludes archived and trashed items', () => {
    expect(rankForResurface([base,{...base,id:'archived',archived:true},{...base,id:'trash',deletedAt:now}],now).map((item)=>item.id)).toEqual(['base']);
  });
  it('penalizes content resurfaced very recently', () => {
    expect(resurfacingScore({...base,lastResurfacedAt:now-3_600_000},now)).toBeLessThan(resurfacingScore(base,now));
  });
});
