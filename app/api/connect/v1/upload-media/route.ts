import { NextRequest, NextResponse } from "next/server";
import {
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} from "@azure/storage-blob";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import { AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_CONTAINER_NAME } from "@/lib/env";
import { EXTENSIONS } from "@/lib/constants";
import { getVideoThumbnailBlobName } from "@/lib/mediaBlobNames";

export async function POST(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);
    if (!userEmail || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileType } = await req.json();
    if (!fileType || typeof fileType !== "string") {
      return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
    }

    const [category] = fileType.split("/");

    let folder = "files";
    let extension = "";

    if (category === "image" && EXTENSIONS[fileType]) {
      folder = "images";
      extension = EXTENSIONS[fileType];
    } else if (category === "video" && EXTENSIONS[fileType]) {
      folder = "videos";
      extension = EXTENSIONS[fileType];
    }

    const blobName = `${folder}/${crypto.randomUUID()}${extension}`;

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
        folder === "videos" ? getVideoThumbnailBlobName(blobName) : undefined,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload URL failed" }, { status: 500 });
  }
}
