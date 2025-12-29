
export type PostMedia = {
  blobName: string;
  type: string;
  name: string;
  mimeType: string;
  size: number;
};

export type PostMediaWithUrl = PostMedia & {
  url: string;
};