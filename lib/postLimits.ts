export const POST_LIMITS = {
  imageCount: 10,
  imageBytes: 10_000_000,
  videoCount: 1,
  videoBytes: 512_000_000,
  documentCount: 5,
  documentBytes: 20_000_000,
  attachmentCount: 10,
  postTextCharacters: 5_000,
  articleBodyCharacters: 20_000,
  titleCharacters: 200,
  linkCount: 5,
  pollMinimumOptions: 2,
  pollMaximumOptions: 10,
  pollOptionCharacters: 100,
  pollMinimumDays: 1,
  pollMaximumDays: 14,
  postsPerMinute: 5,
  postsPerDay: 50,
} as const;

export const POST_UPLOAD_FORMATS = {
  jpg: { type: "image", mimeType: "image/jpeg" },
  jpeg: { type: "image", mimeType: "image/jpeg" },
  png: { type: "image", mimeType: "image/png" },
  webp: { type: "image", mimeType: "image/webp" },
  mp4: { type: "video", mimeType: "video/mp4" },
  mov: { type: "video", mimeType: "video/quicktime" },
  webm: { type: "video", mimeType: "video/webm" },
  pdf: { type: "file", mimeType: "application/pdf" },
  doc: { type: "file", mimeType: "application/msword" },
  docx: {
    type: "file",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xls: { type: "file", mimeType: "application/vnd.ms-excel" },
  xlsx: {
    type: "file",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  ppt: { type: "file", mimeType: "application/vnd.ms-powerpoint" },
  pptx: {
    type: "file",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
} as const;

export type PostAttachmentType = "image" | "video" | "file";
export type LimitedAttachment = {
  type: PostAttachmentType;
  size: number;
  name?: string;
};

export const POST_UPLOAD_ACCEPT = Object.keys(POST_UPLOAD_FORMATS)
  .map((extension) => `.${extension}`)
  .join(",");

export function getUploadFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !(extension in POST_UPLOAD_FORMATS)) return undefined;
  return {
    extension: extension as keyof typeof POST_UPLOAD_FORMATS,
    ...POST_UPLOAD_FORMATS[extension as keyof typeof POST_UPLOAD_FORMATS],
  };
}

export function attachmentLimitError(
  attachments: LimitedAttachment[],
): string | undefined {
  const { imageCount, videoCount, documentCount, attachmentCount } = POST_LIMITS;
  if (attachments.length > attachmentCount) {
    return "A post can have at most 10 attachments.";
  }

  const images = attachments.filter((attachment) => attachment.type === "image");
  const videos = attachments.filter((attachment) => attachment.type === "video");
  const documents = attachments.filter((attachment) => attachment.type === "file");

  if (images.length > imageCount) return "A post can have at most 10 images.";
  if (videos.length > videoCount) return "A post can have at most 1 video.";
  if (documents.length > documentCount) {
    return "A post can have at most 5 documents.";
  }

  for (const attachment of attachments) {
    const maxBytes =
      attachment.type === "image"
        ? POST_LIMITS.imageBytes
        : attachment.type === "video"
          ? POST_LIMITS.videoBytes
          : POST_LIMITS.documentBytes;
    if (!Number.isSafeInteger(attachment.size) || attachment.size <= 0) {
      return "Each attachment must have a valid size.";
    }
    if (attachment.size > maxBytes) {
      const label = attachment.type === "file" ? "document" : attachment.type;
      return `${attachment.name ?? "Attachment"} exceeds the ${maxBytes / 1_000_000} MB ${label} limit.`;
    }
  }
}

export function postContentLimitError(input: {
  postType: string;
  content?: string;
  title?: string;
  links?: unknown[];
  pollOptions?: string[];
  pollDuration?: number;
}): string | undefined {
  const contentMaximum =
    input.postType === "article"
      ? POST_LIMITS.articleBodyCharacters
      : POST_LIMITS.postTextCharacters;
  if ((input.content?.length ?? 0) > contentMaximum) {
    return `${input.postType === "article" ? "Article body" : "Post text"} must not exceed ${contentMaximum.toLocaleString()} characters.`;
  }
  if ((input.title?.length ?? 0) > POST_LIMITS.titleCharacters) {
    return "Article titles and poll questions must not exceed 200 characters.";
  }
  if ((input.links?.length ?? 0) > POST_LIMITS.linkCount) {
    return "A post can have at most 5 links.";
  }
  if (input.postType === "poll") {
    const options = input.pollOptions ?? [];
    if (
      options.length < POST_LIMITS.pollMinimumOptions ||
      options.length > POST_LIMITS.pollMaximumOptions ||
      options.some(
        (option) =>
          !option.trim() || option.length > POST_LIMITS.pollOptionCharacters,
      )
    ) {
      return "Polls require 2–10 non-empty options, each at most 100 characters.";
    }
    if (
      !Number.isInteger(input.pollDuration) ||
      input.pollDuration! < POST_LIMITS.pollMinimumDays ||
      input.pollDuration! > POST_LIMITS.pollMaximumDays
    ) {
      return "Poll duration must be a whole number from 1 to 14 days.";
    }
  }
}
