import { z } from "zod";

export const MediaSchema = z.object({
  blobName: z.string(),
  thumbnailBlobName: z.string().nullable().optional(),
  type: z.enum(["image", "video", "file"]),
  name: z.string(),
  mimetype: z.string(),
  size: z.number(),
});
