'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { File, FileText, Image, Link2, MonitorUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStashStore } from '@/lib/stash/store';
import type { StashItemType } from '@/lib/stash/types';
import { cn } from './ui';

const choices: Array<{ type: StashItemType; label: string; icon: typeof File }> = [
  { type: 'screenshot', label: 'Screenshot', icon: MonitorUp },
  { type: 'image', label: 'Photo', icon: Image },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'note', label: 'Note', icon: FileText },
  { type: 'file', label: 'File', icon: File },
];

export function CaptureDialog({ open, initialType = 'note', onClose }: { open: boolean; initialType?: StashItemType; onClose: () => void }) {
  const createItem = useStashStore((state) => state.createItem);
  const collections = useStashStore((state) => state.collections);
  const [type, setType] = useState<StashItemType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [file, setFile] = useState<File>();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setType(initialType); }, [open, initialType]);
  const fileType = type === 'file' || type === 'image' || type === 'screenshot';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createItem({ type, title: title || file?.name || (type === 'link' ? url : ''), description, url: type === 'link' ? url : undefined, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), collectionId: collectionId || undefined, blob: file, fileName: file?.name, mimeType: file?.type, size: file?.size });
    setTitle(''); setDescription(''); setUrl(''); setTags(''); setFile(undefined); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="capture-dialog max-h-[92vh] overflow-y-auto rounded-[2rem] border bg-background/92 p-5 shadow-2xl backdrop-blur-3xl sm:max-w-xl">
        <DialogHeader><DialogTitle className="text-2xl font-semibold">Save to STASH</DialogTitle><DialogDescription>Capture it now. Organize only what helps.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-5 gap-2" aria-label="Item type">{choices.map(({ type: value, label, icon: Icon }) => <button key={value} type="button" className={cn('capture-type focus-ring', type === value && 'is-active')} onClick={() => { setType(value); if (value === 'file' || value === 'image' || value === 'screenshot') setTimeout(() => fileRef.current?.click(), 0); }}><Icon /><span>{label}</span></button>)}</div>
          {fileType && <div className="drop-zone"><input ref={fileRef} className="sr-only" type="file" accept={type === 'file' ? undefined : 'image/*'} onChange={(event) => { const next = event.target.files?.[0]; setFile(next); if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, '')); }} /><button type="button" onClick={() => fileRef.current?.click()} className="focus-ring rounded-full bg-muted px-4 py-2 text-sm font-medium">{file ? 'Choose a different file' : 'Choose from device'}</button><span className="text-sm text-muted-foreground">{file ? file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB' : 'Stored privately in IndexedDB'}</span></div>}
          {type === 'link' && <label className="field"><span>URL</span><input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>}
          <label className="field"><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === 'note' ? 'What should we remember?' : 'Give it a useful name'} /></label>
          <label className="field"><span>{type === 'note' ? 'Note' : 'Description'}</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context for your future self…" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Tags</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="design, research" /></label><label className="field"><span>Collection</span><select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}><option value="">Inbox</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label></div>
          <button className="primary-button focus-ring w-full" type="submit">Save item</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
