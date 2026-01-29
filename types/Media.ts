export type MediaType = "image" | "video" | "file";

export type MediaItem = {
  id: string;
  file: File | null;
  previewUrl: string | undefined;
  type: MediaType | string;
  blobName?: string;
  thumbnailBlobName?: string;
  fileName?: string;
  isExisting?: boolean;
  name?: string;
  url?: string;
  videoMetadata?: {
    width: number;
    height: number;
    duration: number;
    quality: string; // e.g., "720p", "1080p", "4K"
  };
};
