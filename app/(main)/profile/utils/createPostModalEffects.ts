// This file is meant to make component files cleaner

import type { Dispatch, SetStateAction } from "react";
import type { PostMediaWithUrl } from "@/types/PostMedia";
import type LinkEmbed from "@/types/LinkEmbeds";
import type { MediaItem } from "@/types/Media";

type SetString = Dispatch<SetStateAction<string>>;
type SetBoolean = Dispatch<SetStateAction<boolean>>;
type SetMediaItemArray = Dispatch<SetStateAction<MediaItem[]>>;
type SetPostMediaArray = Dispatch<SetStateAction<PostMediaWithUrl[]>>;
type SetLinkEmbedArray = Dispatch<SetStateAction<LinkEmbed[]>>;

interface LoadEditPostDataArgs {
  editMode: boolean;
  existingPost: any; // ← improve type when possible
  isOpen: boolean;
  setPostType: SetString;
  setTitle: SetString;
  setPostContent: SetString;
  setSelectedVisibility: SetString;
  setExistingMedia: SetPostMediaArray;
  setLinks: SetLinkEmbedArray;
}

export const loadEditPostData = ({
  editMode,
  existingPost,
  isOpen,
  setPostType,
  setTitle,
  setPostContent,
  setSelectedVisibility,
  setExistingMedia,
  setLinks,
}: LoadEditPostDataArgs) => {
  if (!editMode || !existingPost || !isOpen) return;

  setPostType(existingPost.postType || "media");
  setTitle(existingPost.title || "");
  setPostContent(existingPost.content || "");
  setSelectedVisibility(existingPost.visibility || "everyone");

  if (existingPost.media?.length > 0) {
    setExistingMedia(
      existingPost.media.map((m: any) => ({
        blobName: m.blobName,
        thumbnailBlobName: m.thumbnailBlobName,
        url: m.url,
        type: m.type,
        name: m.name ?? m.blobName,
        mimetype: m.mimetype ?? "application/octet-stream",
        size: m.size ?? 0,
      })),
    );
  }

  if (existingPost.links?.length > 0) {
    setLinks(existingPost.links);
  }
};

interface LoadDraftDataArgs {
  editMode: boolean;
  isOpen: boolean;
  hasDraft: () => boolean;
  draft: any; // improve type
  setPostType: SetString;
  setTitle: SetString;
  setPostContent: SetString;
  setSelectedVisibility: SetString;
  setDisableComments: SetBoolean;
}

export const loadDraftDataIfAvailable = ({
  editMode,
  isOpen,
  hasDraft,
  draft,
  setPostType,
  setTitle,
  setPostContent,
  setSelectedVisibility,
  setDisableComments,
}: LoadDraftDataArgs) => {
  if (editMode || !isOpen || !hasDraft()) return;

  setPostType(draft.postType);
  setTitle(draft.title);
  setPostContent(draft.content);
  setSelectedVisibility(draft.visibility);
  setDisableComments(draft.disableComments);
};

interface SaveDraftIfChangedArgs {
  editMode: boolean;
  postType: string;
  title: string;
  postContent: string;
  selectedVisibility: string;
  disableComments: boolean;
  newMedia: MediaItem[];
  links: LinkEmbed[];
  saveDraft: (data: any) => void; // improve type
  draft: any; // improve type
}

export const autoSaveDraft = ({
  editMode,
  postType,
  title,
  postContent,
  selectedVisibility,
  disableComments,
  newMedia,
  links,
  saveDraft,
  draft,
}: SaveDraftIfChangedArgs) => {
  if (editMode) return;

  if (!postContent && !title && newMedia.length === 0 && links.length === 0) {
    return;
  }

  saveDraft({
    postType,
    title,
    content: postContent,
    visibility: selectedVisibility,
    disableComments,
    mediaFileNames:
      newMedia.length > 0
        ? newMedia.map((m) => m.file?.name || "").filter(Boolean)
        : draft.mediaFileNames,
  });
};

interface ResetToInitialStateArgs {
  setSelectedVisibility: SetString;
  clearDraft: () => void;
  setTitle: SetString;
  setPostContent: SetString;
  setNewMedia: SetMediaItemArray;
  setLinks: SetLinkEmbedArray;
  setDisableComments: SetBoolean;
}

export const resetFormToCleanState = ({
  setSelectedVisibility,
  clearDraft,
  setTitle,
  setPostContent,
  setNewMedia,
  setLinks,
  setDisableComments,
}: ResetToInitialStateArgs) => {
  setSelectedVisibility("everyone");
  clearDraft();
  setTitle("");
  setPostContent("");
  setNewMedia([]);
  setLinks([]);
  setDisableComments(false);
};

interface SetInitialPostTypeArgs {
  editMode: boolean;
  initialType: string;
  setPostType: SetString;
}

export const syncInitialPostType = ({
  editMode,
  initialType,
  setPostType,
}: SetInitialPostTypeArgs) => {
  if (!editMode) {
    setPostType(initialType);
  }
};
