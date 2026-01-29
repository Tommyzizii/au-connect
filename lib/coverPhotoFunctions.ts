import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import {
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/lib/env";

const DEFAULT_COVER_PHOTO = "/default_cover.jpg";

function isSafeInternalBlobName(blobName: string) {
  if (!blobName) return false;
  const lower = blobName.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) return false;
  if (blobName.includes("..")) return false;

  return (
    blobName.startsWith("images/") ||
    blobName.startsWith("videos/") ||
    blobName.startsWith("files/") ||
    blobName.startsWith("thumbnails/")
  );
}

function isSafeCoverImageBlobName(blobName: string) {
  return isSafeInternalBlobName(blobName) && blobName.startsWith("images/");
}

async function tryDeleteBlob(blobName: string) {
  if (!isSafeInternalBlobName(blobName)) {
    console.log("Skip deleting unsafe/non-internal blobName:", blobName);
    return;
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient(
      AZURE_STORAGE_CONTAINER_NAME
    );

    const blobClient = containerClient.getBlobClient(blobName);

    const res = await blobClient.deleteIfExists();
    if (!res.succeeded) {
      console.log("Azure deleteIfExists returned not-succeeded for:", blobName);
    }
  } catch (err) {
    console.log(
      "Azure delete failed for blob:",
      blobName,
      err instanceof Error ? err.message : err
    );
  }
}

function isValidCoverPhotoCrop(crop: any) {
  if (!crop || typeof crop !== "object") return false;

  const zoom = crop.zoom;
  const c = crop.crop;
  const pixels = crop.croppedAreaPixels;

  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return false;
  if (!c || typeof c !== "object") return false;
  if (typeof c.x !== "number" || typeof c.y !== "number") return false;

  if (!pixels || typeof pixels !== "object") return false;
  if (
    typeof pixels.x !== "number" ||
    typeof pixels.y !== "number" ||
    typeof pixels.width !== "number" ||
    typeof pixels.height !== "number"
  ) {
    return false;
  }

  if (pixels.width <= 0 || pixels.height <= 0) return false;

  return true;
}

/**
 * DELETE cover photo:
 * - set DB to default cover
 * - delete blobs best-effort
 */
export async function deleteMyCoverPic(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        coverPhoto: true,
        coverPhotoOriginal: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const blobsToDelete = [user.coverPhoto, user.coverPhotoOriginal].filter(
      (x): x is string =>
        typeof x === "string" &&
        x.trim().length > 0 &&
        x !== DEFAULT_COVER_PHOTO
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhoto: DEFAULT_COVER_PHOTO,
        coverPhotoOriginal: null,
        coverPhotoCrop: null,
      },
    });

    for (const blobName of blobsToDelete) {
      await tryDeleteBlob(blobName);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete coverPhoto error:", error);
    return NextResponse.json(
      { error: "Internal server error; delete coverPic" },
      { status: 500 }
    );
  }
}

/**
 * SAVE cover photo:
 * Body must contain:
 * - originalBlobName (images/...)
 * - croppedBlobName  (images/...)
 * - coverPhotoCrop   (json)
 */
export async function saveMyCoverPic(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const originalBlobName = body?.originalBlobName;
    const croppedBlobName = body?.croppedBlobName;
    const coverPhotoCrop = body?.coverPhotoCrop;

    if (!originalBlobName || typeof originalBlobName !== "string") {
      return NextResponse.json(
        { error: "Invalid originalBlobName" },
        { status: 400 }
      );
    }

    if (!croppedBlobName || typeof croppedBlobName !== "string") {
      return NextResponse.json(
        { error: "Invalid croppedBlobName" },
        { status: 400 }
      );
    }

    if (!isSafeCoverImageBlobName(originalBlobName)) {
      return NextResponse.json(
        { error: "originalBlobName not allowed" },
        { status: 400 }
      );
    }

    if (!isSafeCoverImageBlobName(croppedBlobName)) {
      return NextResponse.json(
        { error: "croppedBlobName not allowed" },
        { status: 400 }
      );
    }

    if (!isValidCoverPhotoCrop(coverPhotoCrop)) {
      return NextResponse.json(
        { error: "Invalid coverPhotoCrop" },
        { status: 400 }
      );
    }

    const old = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        coverPhoto: true,
        coverPhotoOriginal: true,
      },
    });

    const oldBlobsToDelete = [old?.coverPhoto, old?.coverPhotoOriginal].filter(
      (x): x is string =>
        typeof x === "string" &&
        x.trim().length > 0 &&
        x !== DEFAULT_COVER_PHOTO &&
        x !== originalBlobName &&
        x !== croppedBlobName
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhoto: croppedBlobName,
        coverPhotoOriginal: originalBlobName,
        coverPhotoCrop: coverPhotoCrop,
      },
    });

    for (const blobName of oldBlobsToDelete) {
      await tryDeleteBlob(blobName);
    }

    return NextResponse.json(
      { success: true, coverPhoto: croppedBlobName },
      { status: 200 }
    );
  } catch (error) {
    console.error("Save coverPhoto error:", error);
    return NextResponse.json(
      { error: "Internal server error; save coverPic" },
      { status: 500 }
    );
  }
}
