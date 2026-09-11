"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import Post from "@/app/components/Post";
import CoverPhotoCropModal from "@/app/(main)/profile/components/CoverPhotoCropModal";
import ProfilePhotoCropModal from "@/app/(main)/profile/components/ProfilePhotoCropModal";
import { uploadFile } from "@/app/(main)/profile/utils/uploadMedia";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { fetchUser } from "@/app/(main)/profile/utils/fetchfunctions";
import {
  COMMUNITY_PROFILE_API_PATH,
  FOLLOW_COMMUNITY_API_PATH,
  POST_API_PATH,
} from "@/lib/constants";
import { useActorStore } from "@/lib/stores/actorStore";
import { ProfileCoverCrop } from "@/types/ProfileCoverCrop";
import { ProfilePicCrop } from "@/types/ProfilePicCrop";
import type PostType from "@/types/Post";

type CommunityProfile = {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  location: string | null;
  profilePic: string | null;
  profilePicOriginal: string | null;
  profilePicCrop: ProfilePicCrop | null;
  coverPhoto: string | null;
  coverPhotoOriginal: string | null;
  coverPhotoCrop: ProfileCoverCrop | null;
  isManager: boolean;
  isFollowing: boolean;
  _count: {
    followers: number;
    posts: number;
    managers: number;
  };
};

type PostsResponse = {
  posts: PostType[];
  nextCursor: string | null;
};

type EditForm = {
  name: string;
  about: string;
  location: string;
};

type ImageTarget = "profilePic" | "coverPhoto";
type ImageMode = "upload" | "edit";

const MAX_PROFILE_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isInternalImageBlobName(blobName?: string | null) {
  return !!blobName && blobName.startsWith("images/");
}

async function urlToLocalFile(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load image");

  const blob = await res.blob();
  const ext =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";

  const file = new File([blob], `edit-${crypto.randomUUID()}.${ext}`, {
    type: blob.type || "image/jpeg",
  });

  return { file, previewUrl: URL.createObjectURL(file) };
}

export default function CommunityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageTarget | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const [profileCropOpen, setProfileCropOpen] = useState(false);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: "",
    about: "",
    location: "",
  });
  const selectedActor = useActorStore((state) => state.selectedActor);

  useEffect(() => {
    params.then((resolved) => setSlug(resolved.slug));
  }, [params]);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const {
    data: community,
    isLoading: communityLoading,
    isError: communityIsError,
    error: communityError,
    refetch: refetchCommunity,
  } = useQuery<CommunityProfile>({
    queryKey: ["community-profile", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug");
      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch community");
      return json.community;
    },
    enabled: !!slug,
    retry: false,
  });

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsResponse>({
    queryKey: ["community-profile-posts", community?.id, selectedActor],
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({ feed: "community" });
      search.set("actorType", selectedActor.type);
      if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
        search.set("actorCommunityId", selectedActor.communityId);
      }
      if (community?.id) search.set("communityId", community.id);
      if (typeof pageParam === "string" && pageParam) {
        search.set("cursor", pageParam);
      }
      const res = await fetch(`${POST_API_PATH}?${search.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch community posts");
      return res.json();
    },
    enabled: !!community?.id,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const coverUrl = useResolvedMediaUrl(community?.coverPhoto, "/default_cover.jpg");
  const profileUrl = useResolvedMediaUrl(
    community?.profilePic,
    "/default_profile.jpg",
  );
  const profileOriginalUrl = useResolvedMediaUrl(
    community?.profilePicOriginal,
    profileUrl,
  );
  const coverOriginalUrl = useResolvedMediaUrl(
    community?.coverPhotoOriginal,
    coverUrl,
  );
  const actingAsThisCommunity =
    selectedActor.type === "COMMUNITY" &&
    !!community?.id &&
    selectedActor.communityId === community.id;
  const canManageThisCommunity = community?.isManager && actingAsThisCommunity;
  const canFollowCommunity = selectedActor.type === "USER";
  const hasProfilePhoto =
    !!community?.profilePic && community.profilePic !== "/default_profile.jpg";
  const hasCoverPhoto =
    !!community?.coverPhoto && community.coverPhoto !== "/default_cover.jpg";
  const canEditProfileOriginal = isInternalImageBlobName(
    community?.profilePicOriginal,
  );
  const canEditCoverOriginal = isInternalImageBlobName(
    community?.coverPhotoOriginal,
  );
  const communityActorPayload =
    canManageThisCommunity && community?.id
      ? {
          actorType: selectedActor.type,
          communityId: community.id,
        }
      : {};

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || !hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
      },
      { rootMargin: "800px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [community?.id, fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  function openEdit() {
    if (!community) return;
    setForm({
      name: community.name,
      about: community.about ?? "",
      location: community.location ?? "",
    });
    setMessage("");
    setEditing(true);
  }

  function resetImageSelection() {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedPreviewUrl(null);
    setSelectedFile(null);
    setProfileCropOpen(false);
    setCoverCropOpen(false);
    setImageMode("upload");
  }

  function closeImageModal() {
    if (saving) return;
    resetImageSelection();
    setImageModal(null);
  }

  function openImageModal(target: ImageTarget) {
    resetImageSelection();
    setMessage("");
    setImageModal(target);
  }

  function pickImage(target: ImageTarget) {
    setImageMode("upload");
    if (target === "profilePic") {
      profileInputRef.current?.click();
      return;
    }
    coverInputRef.current?.click();
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    target: ImageTarget,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("Only JPG, PNG, WEBP are allowed.");
      return;
    }
    if (
      (target === "profilePic" && file.size > MAX_PROFILE_BYTES) ||
      (target === "coverPhoto" && file.size > MAX_COVER_BYTES)
    ) {
      setMessage(
        target === "profilePic"
          ? "File too large. Max is 5MB."
          : "File too large. Max is 8MB.",
      );
      return;
    }

    resetImageSelection();
    setSelectedFile(file);
    setSelectedPreviewUrl(URL.createObjectURL(file));
    setImageMode("upload");
    if (target === "profilePic") {
      setProfileCropOpen(true);
    } else {
      setCoverCropOpen(true);
    }
  }

  async function editCurrentImage(target: ImageTarget) {
    if (!community) return;
    const canEdit =
      target === "profilePic" ? canEditProfileOriginal : canEditCoverOriginal;
    if (!canEdit) return;

    setSaving(true);
    try {
      const { file, previewUrl } = await urlToLocalFile(
        target === "profilePic" ? profileOriginalUrl : coverOriginalUrl,
      );
      resetImageSelection();
      setSelectedFile(file);
      setSelectedPreviewUrl(previewUrl);
      setImageMode("edit");
      if (target === "profilePic") {
        setProfileCropOpen(true);
      } else {
        setCoverCropOpen(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to edit image.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfilePhoto(result: {
    croppedFile: File;
    profilePicCrop: ProfilePicCrop;
  }) {
    if (!slug || !community) return;
    setSaving(true);
    setMessage("");

    try {
      const croppedUpload = await uploadFile(result.croppedFile);
      let originalBlobName = community.profilePicOriginal;

      if (imageMode === "upload" || !originalBlobName) {
        if (!selectedFile) throw new Error("No file selected.");
        const originalUpload = await uploadFile(selectedFile);
        originalBlobName = originalUpload.blobName;
      }

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...communityActorPayload,
          profilePic: croppedUpload.blobName,
          profilePicOriginal: originalBlobName,
          profilePicCrop: result.profilePicCrop,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save profile photo");
      }

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCoverPhoto(result: {
    croppedFile: File;
    coverPhotoCrop: ProfileCoverCrop;
  }) {
    if (!slug || !community) return;
    setSaving(true);
    setMessage("");

    try {
      const croppedUpload = await uploadFile(result.croppedFile);
      let originalBlobName = community.coverPhotoOriginal;

      if (imageMode === "upload" || !originalBlobName) {
        if (!selectedFile) throw new Error("No file selected.");
        const originalUpload = await uploadFile(selectedFile);
        originalBlobName = originalUpload.blobName;
      }

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...communityActorPayload,
          coverPhoto: croppedUpload.blobName,
          coverPhotoOriginal: originalBlobName,
          coverPhotoCrop: result.coverPhotoCrop,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save cover photo");
      }

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage(target: ImageTarget) {
    if (!slug) return;
    setSaving(true);
    setMessage("");

    try {
      const payload =
        target === "profilePic"
          ? {
              profilePic: null,
              profilePicOriginal: null,
              profilePicCrop: null,
            }
          : {
              coverPhoto: null,
              coverPhotoOriginal: null,
              coverPhotoCrop: null,
            };

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...communityActorPayload, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshCommunityIdentity() {
    await refetchCommunity();
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
    await queryClient.invalidateQueries({ queryKey: ["managed-communities"] });
    await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["community-profile-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  async function saveCommunity() {
    if (!slug) return;
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        ...communityActorPayload,
        name: form.name,
        about: form.about,
        location: form.location,
      };
      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update community");
      }

      setEditing(false);
      await refetchCommunity();
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      await queryClient.invalidateQueries({ queryKey: ["managed-communities"] });
      await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["community-profile-posts"] });
      setMessage("Community updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFollow() {
    if (!community) return;

    const res = await fetch(FOLLOW_COMMUNITY_API_PATH(community.id), {
      method: community.isFollowing ? "DELETE" : "POST",
      credentials: "include",
    });

    if (!res.ok) return;
    await refetchCommunity();
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
  }

  if (communityLoading) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-100">
        <Loader2 className="h-7 w-7 animate-spin text-red-500" />
      </div>
    );
  }

  if (communityIsError || !community) {
    const unavailableMessage =
      communityError instanceof Error
        ? communityError.message
        : "Community not found.";

    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-100">
        <div className="mx-4 max-w-md rounded-lg border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Community unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {unavailableMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-100 pb-8">
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl">
          <div className="relative h-56 overflow-hidden rounded-b-lg bg-slate-200 md:h-80">
            <Image
              src={coverUrl}
              alt={community.name}
              fill
              className="object-cover"
            />
            {canManageThisCommunity && (
              <button
                type="button"
                onClick={() => openImageModal("coverPhoto")}
                className="absolute bottom-4 right-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Camera className="h-4 w-4" />
                Edit cover photo
              </button>
            )}
          </div>

          <div className="px-4 pb-5">
            <div className="-mt-12 flex flex-col gap-4 md:-mt-16 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-md md:h-40 md:w-40">
                  <Image
                    src={profileUrl}
                    alt={community.name}
                    fill
                    className="object-cover"
                  />
                  {canManageThisCommunity && (
                    <button
                      type="button"
                      onClick={() => openImageModal("profilePic")}
                      className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-50"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="pb-2">
                  <h1 className="text-3xl font-bold text-slate-950">
                    {community.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{community._count.followers} followers</span>
                    <span>{community._count.posts} posts</span>
                    {community.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {community.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pb-2">
	                {canFollowCommunity && (
	                  <button
	                    type="button"
	                    onClick={toggleFollow}
	                    className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
	                  >
	                    <UserPlus className="h-4 w-4" />
	                    {community.isFollowing ? "Unfollow" : "Follow"}
	                  </button>
	                )}
                {selectedActor.type === "USER" && (
	                  <button
	                    type="button"
	                    onClick={() => router.push(`/messages?communityId=${community.id}`)}
	                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
	                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </button>
                )}
                {canManageThisCommunity && (
                  <button
                    type="button"
                    onClick={openEdit}
	                    className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
	                  >
	                    <Pencil className="h-4 w-4" />
	                    Edit details
	                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto mt-5 grid max-w-5xl gap-5 px-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-950">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {community.about || "No community description yet."}
            </p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-base font-semibold text-slate-950">Community</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                {community._count.managers} managers
              </p>
              <p>{community._count.followers} followers</p>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {message && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          {postsLoading ? (
            <>
              <Post isLoading={true} />
              <Post isLoading={true} />
            </>
          ) : posts.length ? (
            <>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  user={user}
                  post={post}
                  isLoading={false}
                />
              ))}
              {hasNextPage && (
                <div
                  ref={loadMoreRef}
                  className="flex h-14 items-center justify-center text-sm text-slate-500"
                >
                  {isFetchingNextPage && "Loading more posts..."}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-slate-500">
                No posts from this community yet.
              </p>
            </div>
          )}
        </section>
      </main>

      {imageModal && canManageThisCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeImageModal} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {imageModal === "profilePic" ? "Profile photo" : "Cover photo"}
              </h2>
              <button
                type="button"
                onClick={closeImageModal}
                disabled={saving}
                className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className={
                imageModal === "profilePic"
                  ? "relative mx-auto mb-5 h-48 w-48 overflow-hidden rounded-full border"
                  : "relative mb-5 h-40 w-full overflow-hidden rounded-lg border"
              }
            >
              <Image
                src={imageModal === "profilePic" ? profileUrl : coverUrl}
                alt={community.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="space-y-3">
              {(imageModal === "profilePic" ? hasProfilePhoto : hasCoverPhoto) && (
                <button
                  type="button"
                  onClick={() => editCurrentImage(imageModal)}
                  disabled={
                    saving ||
                    (imageModal === "profilePic"
                      ? !canEditProfileOriginal
                      : !canEditCoverOriginal)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <Pencil className="h-4 w-4" />
                  {imageModal === "profilePic"
                    ? "Edit current photo"
                    : "Edit current cover"}
                </button>
              )}

              <button
                type="button"
                onClick={() => pickImage(imageModal)}
                disabled={saving}
                className="w-full rounded-lg border px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              >
                {imageModal === "profilePic"
                  ? "Upload new photo"
                  : "Upload new cover"}
              </button>

              {(imageModal === "profilePic" ? hasProfilePhoto : hasCoverPhoto) && (
                <button
                  type="button"
                  onClick={() => deleteImage(imageModal)}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {imageModal === "profilePic" ? "Delete photo" : "Remove cover"}
                </button>
              )}
            </div>

            <input
              ref={profileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => handleImageChange(event, "profilePic")}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(event) => handleImageChange(event, "coverPhoto")}
            />
          </div>

          <ProfilePhotoCropModal
            open={profileCropOpen}
            imageUrl={selectedPreviewUrl}
            initialCrop={community.profilePicCrop}
            busy={saving}
            onCancel={() => {
              if (!saving) resetImageSelection();
            }}
            onSave={saveProfilePhoto}
          />

          <CoverPhotoCropModal
            open={coverCropOpen}
            imageUrl={selectedPreviewUrl}
            initialCrop={community.coverPhotoCrop}
            busy={saving}
            onCancel={() => {
              if (!saving) resetImageSelection();
            }}
            onSave={saveCoverPhoto}
          />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Edit Community
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Update page details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Location
                </span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
                />
              </label>

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">About</span>
                <textarea
                  value={form.about}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      about: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCommunity}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
