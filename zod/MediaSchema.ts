import { z } from "zod";

export const MediaSchema = z.object({
  blobName: z.string().max(300),
  thumbnailBlobName: z.string().nullable().optional(),
  type: z.enum(["image", "video", "file"]),
  name: z.string().min(1).max(255),
  mimetype: z.string().min(1).max(255),
  size: z.number().int().positive(),
});
