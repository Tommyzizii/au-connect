import { z } from "zod";

import { MediaSchema } from "./MediaSchema";
import JobSchema from "./JobSchema";

const LinkEmbedSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  image: z.string().url().optional(),
  siteName: z.string().optional(),
  favicon: z.string().url().optional(),
  jobDetails: z.string().optional(),
  jobRequirements: z.array(z.string()).optional(),
});

export const CreatePostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "job_post"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(), // duration in days

  // job_post related specific fields
  job: JobSchema.optional(),
});

export const EditPostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "job_post"]),
  title: z.string().optional(),
  content: z.string().optional(),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(),

  // job_post related specific fields
  job: JobSchema.optional(),
});
