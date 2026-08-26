"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileImage, Loader2, Pencil, Check } from "lucide-react";

export interface AttachmentDraft {
  id: string;
  file: File;
  description: string;
  previewUrl: string;
}

const MAX_DIMENSION = 1600; // px, longest side
const JPEG_QUALITY = 0.8;

/** Downscales + re-encodes an image client-side before upload — cuts payload size
 *  substantially for full-resolution phone-camera photos, which matters most on
 *  weak signal inside a mill/warehouse. Falls back to the original file if
 *  compression fails or isn't supported (e.g. non-image files). */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // keep original if compression didn't help

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file; // compression unsupported/failed — proceed with the original
  }
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
  const [compressing, setCompressing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage));
      const additions: AttachmentDraft[] = compressed.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        description: description || file.name,
        previewUrl: URL.createObjectURL(file),
      }));
      setAttachments([...attachments, ...additions]);
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setCompressing(false);
    }
  }

  function removeAttachment(id: string) {
    setAttachments(attachments.filter((a) => a.id !== id));
  }

  function startEditing(a: AttachmentDraft) {
    setEditingId(a.id);
    setEditingValue(a.description);
  }

  // Renaming is optional — an empty save just falls back to the original file name,
  // it never blocks or requires a value.
  function saveEditing(id: string) {
    setAttachments(
      attachments.map((a) =>
        a.id === id ? { ...a, description: editingValue.trim() || a.file.name } : a
      )
    );
    setEditingId(null);
    setEditingValue("");
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">
        Attachment{required ? " *" : ""}
      </span>
      <p className="-mt-1.5 text-xs text-slate-400">Photos only — converted to PDF automatically.</p>
      <textarea
        id="attachmentDescription"
        name="attachmentDescription"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <input
        ref={inputRef}
        id="attachmentFiles"
        name="attachmentFiles"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={compressing}
        className="flex w-fit items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-3.5 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {compressing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          <>
            <Paperclip className="h-4 w-4" /> Attach file
          </>
        )}
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
                {editingId === a.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing(a.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      placeholder={a.file.name}
                      className="min-w-0 flex-1 rounded-md border border-brand/40 px-2 py-1 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="button"
                      onClick={() => saveEditing(a.id)}
                      className="shrink-0 rounded-md p-1 text-brand hover:bg-brand/10"
                      aria-label="Save name"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-medium text-slate-700">{a.description}</p>
                    <button
                      type="button"
                      onClick={() => startEditing(a)}
                      className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      aria-label="Rename"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
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
