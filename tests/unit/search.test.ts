import { describe, expect, it } from 'vitest';
import { searchItems } from '../../lib/stash/search';
import type { StashCollection, StashItem } from '../../lib/stash/types';

const collection: StashCollection = { id:'work',name:'Product Work',icon:'folder',color:'#fff',createdAt:1 };
const item: StashItem = { id:'a',type:'link',title:'Quiet title',description:'Cabin research',notes:'Timber and glass',url:'https://example.com',tags:['architecture'],collectionId:'work',createdAt:1,updatedAt:1,lastInteractedAt:1,pinned:false,favorite:false,archived:false };

describe('offline search', () => {
  it.each(['cabin','timber','architecture','example.com','product work'])('matches %s across indexed fields', (query) => {
    expect(searchItems([item],[collection],query)).toHaveLength(1);
  });
  it('is case insensitive', () => expect(searchItems([item],[collection],'CABIN')).toHaveLength(1));
});
