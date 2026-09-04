export type PostMedia = {
  blobName: string;
  thumbnailBlobName?: string;
  type: string;
  name: string;
  mimetype: string;
  size: number;
  file?: File | null;
  previewUrl?: string;
};

export type PostMediaWithUrl = PostMedia & {
  url: string;
  thumbnailUrl?: string;
};
