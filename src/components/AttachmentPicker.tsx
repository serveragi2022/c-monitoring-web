"use client";

import { useMemo, useRef, useState } from "react";
import { Paperclip, X, FileImage, Loader2, Pencil, ChevronRight, Check } from "lucide-react";
import Modal from "./Modal";

export interface AttachmentDraft {
  id: string;
  file: File;
  description: string;
  previewUrl: string;
  /** True once the user has explicitly entered a name for this photo. Phone cameras
   *  give files generic, meaningless names (e.g. "IMG_20260826_143022.jpg" or a random
   *  blob name) — this flag is what the form actually validates against, not just
   *  "description is non-empty", so a photo can't sneak through with its raw phone
   *  filename as the name. */
  named: boolean;
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

/** If `base` is already used (case-insensitively) among `existing` names, returns
 *  "base 2", "base 3", etc. — whichever suffix isn't taken yet. Otherwise returns
 *  `base` unchanged. Keeps attachment names distinct whether the user typed the same
 *  name manually one photo at a time, or used "apply to all remaining". */
function nextAvailableName(base: string, existing: string[]): string {
  const taken = new Set(existing.map((n) => n.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}

export default function AttachmentPicker({
  attachments,
  setAttachments,
  required,
}: {
  attachments: AttachmentDraft[];
  setAttachments: (v: AttachmentDraft[]) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Naming queue: photos selected in a batch are held here, unnamed, and named one at
  // a time (or via "apply to remaining") before they ever land in `attachments`. This
  // way an attachment can never exist without a real, user-entered name — no separate
  // "required" check needed at submit time.
  const [queueFiles, setQueueFiles] = useState<File[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueName, setQueueName] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(compressImage));
      setQueueFiles(compressed);
      setQueueIndex(0);
      setQueueName("");
      setApplyToAll(false);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setCompressing(false);
    }
  }

  function finishQueue() {
    setQueueFiles(null);
    setQueueIndex(0);
    setQueueName("");
    setApplyToAll(false);
  }

  function cancelQueue() {
    finishQueue();
  }

  function confirmQueueStep() {
    if (!queueFiles || !queueName.trim()) return;
    const base = queueName.trim();

    if (applyToAll) {
      // Name the current photo plus every remaining one in this batch, auto-numbered
      // against every name already in use — both earlier photos in this batch and any
      // attachment already added before this batch started.
      const remaining = queueFiles.slice(queueIndex);
      const takenNames = attachments.map((a) => a.description);
      const additions: AttachmentDraft[] = remaining.map((file) => {
        const name = nextAvailableName(base, takenNames);
        takenNames.push(name);
        return {
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          file,
          description: name,
          previewUrl: URL.createObjectURL(file),
          named: true,
        };
      });
      setAttachments([...attachments, ...additions]);
      finishQueue();
      return;
    }

    // Manual, one photo at a time: if this name matches one already used (typed the
    // same thing twice, e.g. "Receipt" then "Receipt" again), auto-suffix it —
    // "Receipt" stays as is, the next "Receipt" becomes "Receipt 2", and so on.
    const name = nextAvailableName(
      base,
      attachments.map((a) => a.description)
    );
    const file = queueFiles[queueIndex];
    const addition: AttachmentDraft = {
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      description: name,
      previewUrl: URL.createObjectURL(file),
      named: true,
    };
    setAttachments([...attachments, addition]);

    if (queueIndex + 1 < queueFiles.length) {
      setQueueIndex(queueIndex + 1);
      setQueueName("");
    } else {
      finishQueue();
    }
  }

  function removeAttachment(id: string) {
    setAttachments(attachments.filter((a) => a.id !== id));
  }

  function startEditing(a: AttachmentDraft) {
    setEditingId(a.id);
    setEditingValue(a.description);
  }

  function saveEditing(id: string) {
    const trimmed = editingValue.trim();
    if (!trimmed) return; // renaming stays required — blank input just keeps editing open
    const otherNames = attachments.filter((a) => a.id !== id).map((a) => a.description);
    const name = nextAvailableName(trimmed, otherNames);
    setAttachments(attachments.map((a) => (a.id === id ? { ...a, description: name } : a)));
    setEditingId(null);
    setEditingValue("");
  }

  const queueTotal = queueFiles?.length ?? 0;
  const remainingCount = queueTotal - queueIndex;
  const queuePreviewUrl = useMemo(
    () => (queueFiles ? URL.createObjectURL(queueFiles[queueIndex]) : null),
    [queueFiles, queueIndex]
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">
        Attachment{required ? " *" : ""}
      </span>
      <p className="-mt-1.5 text-xs text-slate-400">Photos only — converted to PDF automatically.</p>
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
                        if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingValue("");
                        }
                      }}
                      placeholder="Enter a name"
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

      <Modal open={queueFiles !== null} onClose={cancelQueue} title="Name this photo">
        {queueFiles && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium text-slate-400">
              Photo {queueIndex + 1} of {queueTotal}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={queuePreviewUrl ?? undefined}
              alt="Preview"
              className="h-40 w-full rounded-lg object-contain bg-slate-100"
            />
            <input
              autoFocus
              value={queueName}
              onChange={(e) => setQueueName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmQueueStep();
              }}
              placeholder="e.g. Sales Invoice"
              className="rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {remainingCount > 1 && (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Use this name for all {remainingCount} remaining photos (auto-numbered)
              </label>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={cancelQueue}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmQueueStep}
                disabled={!queueName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applyToAll || queueIndex + 1 >= queueTotal ? "Done" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
