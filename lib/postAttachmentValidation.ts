import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import {
  attachmentLimitError,
  getUploadFormat,
  type LimitedAttachment,
  type PostAttachmentType,
} from "./postLimits";
import { PostLimitError } from "./postQuota";
import { getVideoThumbnailBlobName } from "./mediaBlobNames";

export type PostAttachment = LimitedAttachment & {
  blobName: string;
  name: string;
  mimetype: string;
  thumbnailBlobName?: string | null;
};

function getContainerClient() {
  const credential = new StorageSharedKeyCredential(
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY,
  );
  return new BlobServiceClient(
    `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    credential,
  ).getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
}

function allowedNewBlobName(blobName: string, userId: string) {
  return /^(images|videos|files)\/posts-[a-f\d]{24}-[a-f\d-]{36}\.(jpg|jpeg|png|webp|mp4|mov|webm|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(
    blobName,
  ) && blobName.split("/")[1].startsWith(`posts-${userId}-`);
}

function matchesSignature(type: PostAttachmentType, extension: string, bytes: Buffer) {
  const startsWith = (value: number[]) =>
    value.every((byte, index) => bytes[index] === byte);
  if (type === "image") {
    if (extension === "jpg" || extension === "jpeg") {
      return startsWith([0xff, 0xd8, 0xff]);
    }
    if (extension === "png") return startsWith([0x89, 0x50, 0x4e, 0x47]);
    return bytes.subarray(0, 4).toString() === "RIFF" &&
      bytes.subarray(8, 12).toString() === "WEBP";
  }
  if (type === "video") {
    if (extension === "webm") return startsWith([0x1a, 0x45, 0xdf, 0xa3]);
    return bytes.subarray(4, 8).toString() === "ftyp";
  }
  if (extension === "pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (["doc", "xls", "ppt"].includes(extension)) {
    return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  return startsWith([0x50, 0x4b, 0x03, 0x04]);
}

function assertOfficeContainer(extension: string, data: Buffer) {
  if (["docx", "xlsx", "pptx"].includes(extension)) {
    const expectedEntry =
      extension === "docx"
        ? "word/document.xml"
        : extension === "xlsx"
          ? "xl/workbook.xml"
          : "ppt/presentation.xml";
    if (
      !data.includes(Buffer.from("[Content_Types].xml")) ||
      !data.includes(Buffer.from(expectedEntry)) ||
      /vbaProject|macroEnabled|activeX/i.test(data.toString("latin1"))
    ) {
      throw new PostLimitError(
        "The uploaded ZIP is not a permitted non-macro Microsoft Office document.",
      );
    }
  }
}

async function validateAttachmentBytes(
  attachment: PostAttachment,
  userId: string,
  retainedBlobNames: Set<string>,
) {
  const isRetained = retainedBlobNames.has(attachment.blobName);
  if (!isRetained && !allowedNewBlobName(attachment.blobName, userId)) {
    throw new PostLimitError("Attachment does not belong to this account.");
  }

  const client = getContainerClient().getBlockBlobClient(attachment.blobName);
  try {
    const properties = await client.getProperties();
    const actualSize = properties.contentLength ?? 0;
    const format = getUploadFormat(attachment.blobName);
    if (!format || actualSize <= 0) {
      throw new PostLimitError("Uploaded attachment is invalid or empty.");
    }
    const sizeError = attachmentLimitError([
      { type: format.type, size: actualSize, name: attachment.name },
    ]);
    if (sizeError) throw new PostLimitError(sizeError);

    const header = await client.downloadToBuffer(0, Math.min(actualSize, 4096));
    if (!matchesSignature(format.type, format.extension, header)) {
      throw new PostLimitError("Uploaded bytes do not match the selected file format.");
    }

    if (format.type === "file" && ["docx", "xlsx", "pptx"].includes(format.extension)) {
      const document = await client.downloadToBuffer(0, actualSize);
      assertOfficeContainer(format.extension, document);
    }

    return {
      ...attachment,
      type: format.type,
      mimetype: format.mimeType,
      size: actualSize,
      thumbnailBlobName:
        format.type === "video"
          ? getVideoThumbnailBlobName(attachment.blobName)
          : undefined,
    } as PostAttachment;
  } catch (error) {
    if (!isRetained && error instanceof PostLimitError && error.status === 400) {
      await client.deleteIfExists().catch((cleanupError) =>
        console.error("Failed to clean up rejected upload:", cleanupError),
      );
    }
    throw error;
  }
}

export async function validatePostAttachments(
  media: PostAttachment[],
  userId: string,
  retainedMedia: PostAttachment[] = [],
) {
  const limitError = attachmentLimitError(media);
  if (limitError) throw new PostLimitError(limitError);

  if (new Set(media.map((attachment) => attachment.blobName)).size !== media.length) {
    throw new PostLimitError("A post cannot contain the same attachment twice.");
  }

  const retainedBlobNames = new Set(retainedMedia.map((mediaItem) => mediaItem.blobName));
  const result: PostAttachment[] = [];
  for (const attachment of media) {
    result.push(
      await validateAttachmentBytes(attachment, userId, retainedBlobNames),
    );
  }

  const actualLimitError = attachmentLimitError(result);
  if (actualLimitError) throw new PostLimitError(actualLimitError);
  return result;
}
