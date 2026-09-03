'use client';

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Camera, File, FileText, Lightbulb, Link2, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStashStore } from '@/lib/stash/store';
import type { StashItemType } from '@/lib/stash/types';
import { cn } from './ui';

const choices: Array<{ type: StashItemType; label: string; icon: typeof File }> = [
  { type: 'screenshot', label: 'Screenshot', icon: Camera },
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'note', label: 'Note', icon: FileText },
  { type: 'file', label: 'File', icon: File },
  { type: 'idea', label: 'Idea', icon: Lightbulb },
];

export function CaptureDialog({
  open,
  initialType = 'screenshot',
  onClose,
}: {
  open: boolean;
  initialType?: StashItemType;
  onClose: () => void;
}) {
  const createItem = useStashStore((state) => state.createItem);
  const collections = useStashStore((state) => state.collections);

  const [type, setType] = useState<StashItemType>(initialType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [file, setFile] = useState<File>();
  const [filePreview, setFilePreview] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setType(initialType);
    } else {
      setFile(undefined);
    }
  }, [open, initialType]);

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileChange = (selected?: File) => {
    if (!selected) return;
    setFile(selected);
    if (filePreview) URL.revokeObjectURL(filePreview);

    if (selected.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(undefined);
    }

    if (!title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type.startsWith('image/')) {
        setType('screenshot');
      } else {
        setType('file');
      }
      handleFileChange(droppedFile);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createItem({
      type,
      title: title || file?.name || (type === 'link' ? url : 'Untitled idea'),
      description,
      notes: type === 'note' || type === 'idea' ? description : '',
      url: type === 'link' ? url : undefined,
      tags: tags
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
      collectionId: collectionId || undefined,
      blob: file,
      fileName: file?.name,
      mimeType: file?.type,
      size: file?.size,
    });

    // The Blob is persisted in IndexedDB; the transient preview URL must not
    // be reused as a permanent image reference.
    if (filePreview) URL.revokeObjectURL(filePreview);

    setTitle('');
    setDescription('');
    setUrl('');
    setTags('');
    setCollectionId('');
    setFile(undefined);
    setFilePreview(undefined);
    onClose();
  };

  const isFileAllowed = type === 'screenshot' || type === 'image' || type === 'file';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="capture-dialog max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/15 bg-[#091718]/95 p-6 shadow-2xl backdrop-blur-3xl sm:max-w-xl text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Save to STASH
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Capture it now. Everything stays completely private on this device.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-2 space-y-4">
          {/* Quick Choice Buttons */}
          <div className="grid grid-cols-5 gap-2" aria-label="Item type selection">
            {choices.map(({ type: value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 text-xs font-medium transition-all focus-ring',
                  type === value
                    ? 'border border-[var(--stash-accent)] bg-[var(--stash-accent)]/15 text-[var(--stash-accent)] shadow-sm'
                    : 'border border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground'
                )}
                onClick={() => {
                  setType(value);
                  if (value === 'screenshot' || value === 'file') {
                    setTimeout(() => fileRef.current?.click(), 50);
                  }
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Drag & Drop File Zone */}
          {isFileAllowed && (
            <button
              type="button"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative flex min-h-[7rem] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all focus-ring',
                isDragging
                  ? 'border-[var(--stash-accent)] bg-[var(--stash-accent)]/10'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
              )}
            >
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept={type === 'screenshot' ? 'image/*' : undefined}
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              {filePreview ? (
                <div className="relative flex items-center gap-3">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-xl object-cover border border-white/15 shadow-md"
                  />
                  <div className="text-left text-xs">
                    <p className="font-semibold text-foreground truncate max-w-[200px]">{file?.name}</p>
                    <p className="text-muted-foreground">{file ? `${Math.round(file.size / 1024)} KB` : ''}</p>
                    <span className="mt-1 inline-block text-[var(--stash-accent)]">Click to replace file</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(undefined);
                      setFilePreview(undefined);
                    }}
                    className="ml-2 rounded-full bg-white/10 p-1 text-muted-foreground hover:bg-white/20 hover:text-foreground"
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[var(--stash-accent)]">
                    <Upload size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {file ? file.name : type === 'screenshot' ? 'Drop an image or click to browse' : 'Drop a document or click to browse'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stored offline in private IndexedDB
                    </p>
                  </div>
                </div>
              )}
            </button>
          )}

          {/* Link URL Input */}
          {type === 'link' && (
            <label className="field">
              <span className="text-xs font-medium text-muted-foreground">Web URL</span>
              <div className="relative flex items-center">
                <Link2 size={16} className="absolute left-3 text-muted-foreground" />
                <input
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[var(--stash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--stash-accent)]"
                />
              </div>
            </label>
          )}

          {/* Title */}
          <label className="field">
            <span className="text-xs font-medium text-muted-foreground">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'idea'
                  ? '“The details are not the details...”'
                  : type === 'note'
                  ? 'Meeting notes, thoughts, or reminder'
                  : 'Give it a descriptive name'
              }
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[var(--stash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--stash-accent)]"
            />
          </label>

          {/* Notes or Description */}
          <label className="field">
            <span className="text-xs font-medium text-muted-foreground">
              {type === 'note' || type === 'idea' ? 'Notes & Reflections' : 'Description'}
            </span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key insights, context, or takeaways for your future self…"
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[var(--stash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--stash-accent)] resize-none"
            />
          </label>

          {/* Tags & Collection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field">
              <span className="text-xs font-medium text-muted-foreground">Tags (comma separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="architecture, cabin, minimal"
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[var(--stash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--stash-accent)]"
              />
            </label>

            <label className="field">
              <span className="text-xs font-medium text-muted-foreground">Collection</span>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#091718] px-3 py-2.5 text-sm text-foreground focus:border-[var(--stash-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--stash-accent)]"
              >
                <option value="">Inbox (Unsorted)</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[var(--stash-accent)] py-3 font-semibold text-[#032e2a] shadow-lg shadow-[var(--stash-accent)]/20 transition-transform active:scale-[0.98] hover:brightness-105 focus-ring"
          >
            Save to STASH
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
