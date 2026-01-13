import { REPLY_CHARACTER_LIMIT } from "@/lib/constants";
import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const CreateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content cannot be empty")
    .max(REPLY_CHARACTER_LIMIT, `Comment content cannot exceed ${REPLY_CHARACTER_LIMIT} characters`),

  parentCommentId: objectId.optional(),
});
