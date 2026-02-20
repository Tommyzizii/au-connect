"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { X, Trash2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import User from "@/types/User";
import CoverPhotoCropModal from "./CoverPhotoCropModal";
import { uploadFile } from "@/app/(main)/profile/utils/uploadMedia";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { DELETE_PROFILE_COVER_API_PATH ,UPLOAD_PROFILE_COVER_API_PATH} from "@/lib/constants";

const DEFAULT_COVER = "/default_cover.jpg";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isInternalImage(blobName?: string) {
  return !!blobName && blobName.startsWith("images/");
}

async function urlToLocalFile(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load image");

  const blob = await res.blob();
  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
      ? "webp"
      : "jpg";

  const file = new File([blob], `edit-${crypto.randomUUID()}.${ext}`, {
    type: blob.type || "image/jpeg",
  });

  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  user: User;
  resolvedCoverPhotoUrl: string;
  onCoverPhotoChanged: (newCover: string) => void;
};

export default function CoverPhotoModal({
  open,
  onClose,
  isOwner,
  user,
  resolvedCoverPhotoUrl,
  onCoverPhotoChanged,
}: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openCrop, setOpenCrop] = useState(false);

  const [mode, setMode] = useState<"upload" | "edit">("upload");

  const cachedUser = queryClient.getQueryData(["user"]) as User | undefined;
  const effectiveUser = useMemo(
    () => (cachedUser?.id === user.id ? { ...user, ...cachedUser } : user),
    [cachedUser, user]
  );

  const resolvedOriginalUrl = useResolvedMediaUrl(
    effectiveUser.coverPhotoOriginal || null,
    resolvedCoverPhotoUrl
  );

  const canEditOriginal = isInternalImage(effectiveUser.coverPhotoOriginal);

  useEffect(() => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      setOpenCrop(false);
      setMode("upload");
      setError("");
      setBusy(false);
    }
  }, [open, previewUrl]);

  if (!open) return null;

  const hasCover =
    !!effectiveUser.coverPhoto &&
    effectiveUser.coverPhoto !== DEFAULT_COVER;

  function pickFile() {
    setError("");
    setMode("upload");
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WEBP are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large. Max is 8MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("upload");
    setOpenCrop(true);
  }

  async function handleEditCurrent() {
    if (!canEditOriginal) return;

    try {
      setBusy(true);
      const { file, previewUrl } = await urlToLocalFile(resolvedOriginalUrl);
      setSelectedFile(file);
      setPreviewUrl(previewUrl);
      setMode("edit");
      setOpenCrop(true);
    } catch {
      setError("Failed to edit cover photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    try {
      setBusy(true);
      setError("");

      const res = await fetch(
        DELETE_PROFILE_COVER_API_PATH,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");

      onCoverPhotoChanged(DEFAULT_COVER);

      queryClient.setQueryData(["user"], (old: any) =>
        old
          ? {
              ...old,
              coverPhoto: DEFAULT_COVER,
              coverPhotoCrop: null,
              coverPhotoOriginal: null,
            }
          : old
      );

      onClose();
    } catch (e: any) {
      setError(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(result: {
    croppedFile: File;
    coverPhotoCrop: any;
  }) {
    try {
      setBusy(true);
      setError("");

      const croppedUpload = await uploadFile(result.croppedFile);

      let originalBlob = effectiveUser.coverPhotoOriginal;
      if (mode === "upload" || !originalBlob) {
        if (!selectedFile) throw new Error("Missing original file");
        const originalUpload = await uploadFile(selectedFile);
        originalBlob = originalUpload.blobName;
      }

      const res = await fetch(
        UPLOAD_PROFILE_COVER_API_PATH,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalBlobName: originalBlob,
            croppedBlobName: croppedUpload.blobName,
            coverPhotoCrop: result.coverPhotoCrop,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      onCoverPhotoChanged(croppedUpload.blobName);

      queryClient.setQueryData(["user"], (old: any) =>
        old
          ? {
              ...old,
              coverPhoto: croppedUpload.blobName,
              coverPhotoCrop: result.coverPhotoCrop,
              coverPhotoOriginal: originalBlob,
            }
          : old
      );

      onClose();
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP (same as PP) */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg p-6 text-gray-900">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Cover photo</h2>
          <button
            onClick={() => !busy && onClose()}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        {/* PREVIEW */}
        <div className="relative w-full h-40 mb-5 rounded-lg overflow-hidden border">
          <Image
            src={resolvedCoverPhotoUrl}
            alt="cover"
            fill
            className="object-cover"
          />
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
            {error}
          </div>
        )}

        {isOwner && (
          <div className="space-y-3">
            {hasCover && (
              <button
                onClick={handleEditCurrent}
                disabled={!canEditOriginal || busy}
                className="w-full px-4 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Pencil size={16} />
                Edit current cover
              </button>
            )}

            <button
              onClick={pickFile}
              disabled={busy}
              className="w-full px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              Upload new cover
            </button>

            {hasCover && (
              <button
                onClick={handleDelete}
                disabled={busy}
                className="w-full px-4 py-2 border border-red-500 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={16} />
                Remove cover
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              hidden
              onChange={onFileChange}
            />
          </div>
        )}

        <CoverPhotoCropModal
          open={openCrop}
          imageUrl={previewUrl}
          busy={busy}
          initialCrop={effectiveUser.coverPhotoCrop ?? null}
          onCancel={() => !busy && setOpenCrop(false)}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
