import { NextRequest, NextResponse } from "next/server";
import {
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} from "@azure/storage-blob";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import { AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from "@/lib/env";
import { getUploadFormat } from "@/lib/postLimits";
import { getVideoThumbnailBlobName } from "@/lib/mediaBlobNames";

export async function POST(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);
    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileSize, purpose } = await req.json();
    if (
      typeof fileName !== "string" ||
      !Number.isSafeInteger(fileSize) ||
      fileSize <= 0
    ) {
      return NextResponse.json({ error: "Invalid upload details" }, { status: 400 });
    }

    const format = getUploadFormat(fileName);
    if (!format) {
      return NextResponse.json(
        { error: "Allowed uploads: JPG, PNG, WebP, MP4, MOV, WebM, PDF, DOC, DOCX, XLS, XLSX, PPT, and PPTX." },
        { status: 400 },
      );
    }
    const maximumSize =
      format.type === "image" ? 10_000_000 : format.type === "video" ? 512_000_000 : 20_000_000;
    if (fileSize > maximumSize) {
      return NextResponse.json({ error: `This ${format.type === "file" ? "document" : format.type} exceeds its ${maximumSize / 1_000_000} MB limit.` }, { status: 400 });
    }

    const folder = format.type === "image" ? "images" : format.type === "video" ? "videos" : "files";
    const blobName =
      purpose === "post"
        ? `${folder}/posts-${userId}-${crypto.randomUUID()}.${format.extension}`
        : `${folder}/${crypto.randomUUID()}.${format.extension}`;

    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: AZURE_STORAGE_CONTAINER_NAME,
        blobName,
        permissions: BlobSASPermissions.parse("cw"),
        expiresOn: new Date(Date.now() + 5 * 60 * 1000),
      },
      sharedKeyCredential
    ).toString();

    const uploadUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}?${sasToken}`;

    return NextResponse.json({
      uploadUrl,
      blobName,
      thumbnailBlobName:
        format.type === "video" ? getVideoThumbnailBlobName(blobName) : undefined,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload URL failed" }, { status: 500 });
  }
}
