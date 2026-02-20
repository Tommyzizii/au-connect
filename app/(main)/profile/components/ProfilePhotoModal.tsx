"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useMemo } from "react";
import { X, Trash2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import User from "@/types/User";
import ProfilePhotoCropModal from "@/app/(main)/profile/components/ProfilePhotoCropModal";
import { uploadFile } from "@/app/(main)/profile/utils/uploadMedia";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { DELETE_PROFILE_PIC_API_PATH,UPLOAD_PROFILE_PIC_API_PATH } from "@/lib/constants";

type ProfilePhotoModalProps = {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  user: User;

  // current cropped avatar URL (already resolved in parent)
  resolvedProfilePicUrl: string;

  onProfilePicChanged: (newProfilePicValue: string) => void;
};

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isInternalProfileImageBlobName(blobName?: string) {
  return !!blobName && blobName.startsWith("images/") ;
}

/**
 * Convert a URL to a local File + blob URL so cropping via canvas is always safe.
 * (Avoids CORS-tainted canvas issues.)
 */
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

  const previewUrl = URL.createObjectURL(file);
  return { file, previewUrl };
}

/**
 * Patch infinite-query post pages so avatar changes immediately without waiting for refetch.
 * Works for profile posts query shape: { pages: [{ posts: [...] , nextCursor: ...}, ...] }
 */
function patchInfinitePostsAvatar(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: any[],
  userId: string,
  newProfilePic: string
) {
  queryClient.setQueryData(queryKey, (old: any) => {
    if (!old?.pages || !Array.isArray(old.pages)) return old;

    return {
      ...old,
      pages: old.pages.map((page: any) => {
        if (!page?.posts || !Array.isArray(page.posts)) return page;

        return {
          ...page,
          posts: page.posts.map((p: any) => {
            const isOwner = p?.userId === userId || p?.user?.id === userId;
            if (!isOwner) return p;

            return {
              ...p,
              profilePic: newProfilePic,
              user: p.user ? { ...p.user, profilePic: newProfilePic } : p.user,
            };
          }),
        };
      }),
    };
  });
}

export default function ProfilePhotoModal({
  open,
  onClose,
  isOwner,
  user,
  resolvedProfilePicUrl,
  onProfilePicChanged,
}: ProfilePhotoModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null
  );
  const [openCrop, setOpenCrop] = useState(false);

  // "upload" = upload new photo, "edit" = re-crop original photo
  const [mode, setMode] = useState<"upload" | "edit">("upload");

  // Use React Query cache as latest truth (SSR `user` can be stale)
  const cachedUser = queryClient.getQueryData(["user"]) as User | undefined;

  const effectiveUser: User = useMemo(() => {
    if (cachedUser && cachedUser.id === user.id) return { ...user, ...cachedUser };
    return user;
  }, [cachedUser, user]);

  // Resolve original blobName -> URL (fallback to current avatar URL)
  const resolvedProfilePicOriginalUrl = useResolvedMediaUrl(
    effectiveUser.profilePicOriginal || null,
    resolvedProfilePicUrl
  );

  // Disable edit for OAuth/external originals (not images/...)
  const canEditOriginal = isInternalProfileImageBlobName(
    effectiveUser.profilePicOriginal
  );

  // cleanup when modal closes/unmounts
  useEffect(() => {
    if (!open) {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      setSelectedPreviewUrl(null);
      setSelectedFile(null);
      setOpenCrop(false);
      setMode("upload");
      setError("");
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const hasPhoto =
    !!effectiveUser.profilePic &&
    effectiveUser.profilePic.trim() !== "" &&
    effectiveUser.profilePic !== DEFAULT_PROFILE_PIC;

  const showDelete = isOwner && hasPhoto;

  function resetSelection() {
    setSelectedFile(null);
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedPreviewUrl(null);
    setOpenCrop(false);
    setMode("upload");
  }

  function pickFile() {
    setError("");
    setMode("upload");
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");

    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WEBP are allowed.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("File too large. Max is 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedPreviewUrl(url);
    setMode("upload");
    setOpenCrop(true);
  }

  async function handleEditCurrent() {
    if (!canEditOriginal) return;

    try {
      setBusy(true);
      setError("");

      const { file, previewUrl } = await urlToLocalFile(
        resolvedProfilePicOriginalUrl
      );

      setSelectedFile(file);
      setSelectedPreviewUrl(previewUrl);
      setMode("edit");
      setOpenCrop(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit photo");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    try {
      setBusy(true);
      setError("");

      const res = await fetch(DELETE_PROFILE_PIC_API_PATH, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Delete failed");

      //Update local avatar on profile page
      onProfilePicChanged(DEFAULT_PROFILE_PIC);

      //Update header cache immediately
      queryClient.setQueryData(["user"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profilePic: DEFAULT_PROFILE_PIC,
          profilePicCrop: null,
          profilePicOriginal: null,
        };
      });

      // Update cached profile posts instantly + refetch in background
      patchInfinitePostsAvatar(
        queryClient,
        ["profilePosts", effectiveUser.id],
        effectiveUser.id,
        DEFAULT_PROFILE_PIC
      );
      queryClient.invalidateQueries({ queryKey: ["profilePosts", effectiveUser.id] });

      // queryClient.invalidateQueries({ queryKey: ["feed"] });
      // queryClient.invalidateQueries({ queryKey: ["posts"] });

      resetSelection();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCropped(result: {
    croppedFile: File;
    profilePicCrop: any;
  }) {
    try {
      setBusy(true);
      setError("");

      // Always upload new cropped
      const croppedUpload = await uploadFile(result.croppedFile);

      // Decide originalBlobName
      let originalBlobName: string | undefined = effectiveUser.profilePicOriginal;

      if (mode === "upload") {
        if (!selectedFile) throw new Error("No file selected");
        const originalUpload = await uploadFile(selectedFile);
        originalBlobName = originalUpload.blobName;
      } else {
        if (!originalBlobName || originalBlobName.trim() === "") {
          if (!selectedFile) throw new Error("Original image missing");
          const originalUpload = await uploadFile(selectedFile);
          originalBlobName = originalUpload.blobName;
        }
      }

      const res = await fetch(UPLOAD_PROFILE_PIC_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalBlobName,
          croppedBlobName: croppedUpload.blobName,
          profilePicCrop: result.profilePicCrop,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save profile photo failed");

      //Update local avatar on profile page
      onProfilePicChanged(croppedUpload.blobName);

      //Update header cache immediately
      queryClient.setQueryData(["user"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          profilePic: croppedUpload.blobName,
          profilePicCrop: result.profilePicCrop,
          profilePicOriginal: originalBlobName,
        };
      });

      //Fix issue: update cached profile posts instantly + refetch in background
      patchInfinitePostsAvatar(
        queryClient,
        ["profilePosts", effectiveUser.id],
        effectiveUser.id,
        croppedUpload.blobName
      );
      queryClient.invalidateQueries({ queryKey: ["profilePosts", effectiveUser.id] });

      // queryClient.invalidateQueries({ queryKey: ["feed"] });
      // queryClient.invalidateQueries({ queryKey: ["posts"] });

      resetSelection();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!busy) {
            resetSelection();
            onClose();
          }
        }}
      />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg p-6 text-gray-900">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile photo</h2>
          <button
            onClick={() => {
              if (!busy) {
                resetSelection();
                onClose();
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
            aria-label="Close"
            type="button"
            disabled={busy}
          >
            <X size={18} className="text-gray-700" />
          </button>
        </div>

        {/* AVATAR PREVIEW */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-48">
            <Image
              src={resolvedProfilePicUrl}
              alt={`${effectiveUser.username}'s profile photo`}
              fill
              className="rounded-full object-cover border"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
            {error}
          </div>
        )}

        {/* ACTIONS */}
        {isOwner && (
          <div className="space-y-3">
            {hasPhoto && (
              <button
                type="button"
                onClick={canEditOriginal ? handleEditCurrent : undefined}
                disabled={busy || !canEditOriginal}
                className={`w-full px-4 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                  canEditOriginal
                    ? "text-gray-900 hover:bg-gray-50 cursor-pointer"
                    : "text-gray-400 cursor-not-allowed bg-gray-50"
                }`}
              >
                <Pencil size={16} />
                {busy ? "Please wait..." : "Edit current photo"}
              </button>
            )}

            <button
              type="button"
              onClick={pickFile}
              disabled={busy}
              className="w-full px-4 py-2 border rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Please wait..." : "Upload new photo"}
            </button>

            {showDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="w-full px-4 py-2 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={16} />
                Delete photo
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}

        {/* CROP MODAL */}
        <ProfilePhotoCropModal
          open={openCrop}
          imageUrl={selectedPreviewUrl}
          initialCrop={effectiveUser.profilePicCrop ?? null}
          onCancel={() => {
            if (!busy) resetSelection();
          }}
          onSave={handleSaveCropped}
          busy={busy}
        />
      </div>
    </div>
  );
}
