export type MediaType = "image" | "video" | "file";

export type MediaItem = {
  id: string;
  file: File;
  previewUrl: string | undefined;
  type: MediaType;
  videoMetadata?: {
    width: number;
    height: number;
    duration: number;
    quality: string; // e.g., "720p", "1080p", "4K"
  };
};

