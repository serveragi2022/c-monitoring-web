"use client";

import { useRef } from "react";
import { Paperclip, X, FileImage } from "lucide-react";

export interface AttachmentDraft {
  id: string;
  file: File;
  description: string;
  previewUrl: string;
}

export default function AttachmentPicker({
  attachments,
  setAttachments,
  description,
  setDescription,
  required,
}: {
  attachments: AttachmentDraft[];
  setAttachments: (v: AttachmentDraft[]) => void;
  description: string;
  setDescription: (v: string) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const additions: AttachmentDraft[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      description: description || file.name,
      previewUrl: URL.createObjectURL(file),
    }));
    setAttachments([...attachments, ...additions]);
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments(attachments.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">
        Attachment{required ? " *" : ""}
      </span>
      <p className="-mt-1.5 text-xs text-slate-400">Photos only — converted to PDF automatically.</p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-3.5 py-2 text-sm font-medium text-brand transition hover:bg-brand/10"
      >
        <Paperclip className="h-4 w-4" /> Attach file
      </button>

      {attachments.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              {a.file.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.previewUrl}
                  alt={a.description}
                  className="h-12 w-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-200 text-slate-500">
                  <FileImage className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{a.description}</p>
                <p className="truncate text-[11px] text-slate-400">{a.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
