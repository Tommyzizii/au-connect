import { z } from "zod";

import { MediaSchema } from "./MediaSchema";
import JobSchema from "./JobSchema";
import { POST_LIMITS, postContentLimitError } from "@/lib/postLimits";

const optionalString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().url().optional());

const LinkEmbedSchema = z.object({
  url: z.string().trim().url("Must be a valid URL"),
  title: z.string().trim().min(1, "Title is required"),
  description: optionalString,
  image: optionalUrl,
  siteName: optionalString,
  favicon: optionalUrl,
  jobDetails: optionalString,
  jobSkills: z.array(z.string()).optional(),
  jobRequirements: z.array(z.string()).optional(),
});

export const CreatePostSchema = z.object({
  actorType: z.enum(["USER", "COMMUNITY"]).default("USER"),
  communityId: z.string().optional().nullable(),
  postType: z.enum(["media", "article", "poll", "job_post"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().max(POST_LIMITS.titleCharacters).optional(),
  content: z.string().max(POST_LIMITS.articleBodyCharacters),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).max(POST_LIMITS.attachmentCount).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).max(POST_LIMITS.linkCount).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string().max(POST_LIMITS.pollOptionCharacters)).optional(),
  pollDuration: z.number().int().min(POST_LIMITS.pollMinimumDays).max(POST_LIMITS.pollMaximumDays).optional(), // duration in days

  // job_post related specific fields
  job: JobSchema.optional(),
}).superRefine((value, context) => {
  const error = postContentLimitError(value);
  if (error) context.addIssue({ code: "custom", message: error });
});

export const EditPostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "job_post"]),
  title: z.string().max(POST_LIMITS.titleCharacters).optional(),
  content: z.string().max(POST_LIMITS.articleBodyCharacters).optional(),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).max(POST_LIMITS.attachmentCount).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).max(POST_LIMITS.linkCount).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string().max(POST_LIMITS.pollOptionCharacters)).optional(),
  pollDuration: z.number().int().min(POST_LIMITS.pollMinimumDays).max(POST_LIMITS.pollMaximumDays).optional(),

  // job_post related specific fields
  job: JobSchema.optional(),
}).superRefine((value, context) => {
  if (value.content !== undefined || value.title !== undefined || value.links !== undefined || value.pollOptions !== undefined || value.pollDuration !== undefined) {
    const error = postContentLimitError(
      value.postType === "poll" &&
      value.pollOptions === undefined &&
      value.pollDuration === undefined
        ? { ...value, postType: "media" }
        : value,
    );
    if (error) context.addIssue({ code: "custom", message: error });
  }
});
