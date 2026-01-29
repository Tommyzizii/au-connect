import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import {
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/lib/env";

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

/**
 * Security: only allow deleting internal Azure blobNames (not URLs).
 * - must not start with http(s)
 * - must not contain ".."
 * - must start with allowed folder prefixes
 */
function isSafeInternalBlobName(blobName: string) {
  if (!blobName) return false;
  const lower = blobName.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) return false;
  if (blobName.includes("..")) return false;

  // limit folders
  return (
    blobName.startsWith("images/") ||
    blobName.startsWith("videos/") ||
    blobName.startsWith("files/") ||
    blobName.startsWith("thumbnails/")
  );
}

/**
 * For profile photos, we ONLY accept images/...
 * This blocks someone from saving a "videos/" blob as profile picture.
 */
function isSafeProfileImageBlobName(blobName: string) {
  return isSafeInternalBlobName(blobName) && blobName.startsWith("images/");
}

/**
 * Best-effort delete: logs errors but does NOT block DB updates.
 */
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

    // deleteIfExists avoids throwing when blob missing
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

/**
 * Minimal validation for profilePicCrop Json.
 * We don’t over-reject, but block obvious bad payloads.
 */
function isValidProfilePicCrop(crop: any) {
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

  // basic sanity checks
  if (pixels.width <= 0 || pixels.height <= 0) return false;

  return true;
}

/**
 * DELETE profile picture (Option B):
 * - DB cleared immediately
 * - Azure delete best-effort (log only)
 */
export async function deleteMyProfilePic(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    // fetch current values first (so we know what to delete)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profilePic: true,
        profilePicOriginal: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const blobsToDelete = [user.profilePic, user.profilePicOriginal].filter(
      (x): x is string =>
        typeof x === "string" &&
        x.trim().length > 0 &&
        x !== DEFAULT_PROFILE_PIC
    );

    // 1) Clear DB first (Option B)
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePic: DEFAULT_PROFILE_PIC,
        profilePicOriginal: null,
        profilePicCrop: null,
      },
    });

    // Optional: keep denormalized profilePic in sync so old posts/comments show default
    await prisma.post.updateMany({
      where: { userId },
      data: { profilePic: DEFAULT_PROFILE_PIC },
    });

    await prisma.comment.updateMany({
      where: { userId },
      data: { profilePic: DEFAULT_PROFILE_PIC },
    });

    // 2) Best-effort delete blobs
    for (const blobName of blobsToDelete) {
      await tryDeleteBlob(blobName);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete profilePic error:", error);
    return NextResponse.json(
      { error: "Internal server error; delete profilePic" },
      { status: 500 }
    );
  }
}

/**
 * SAVE profile picture (Option B):
 * Body must contain:
 * - originalBlobName (images/...)
 * - croppedBlobName  (images/...)
 * - profilePicCrop   (json)
 *
 * Behavior:
 * - update DB first (new values)
 * - update denormalized profilePic in posts/comments
 * - delete old blobs best-effort (log only)
 */
export async function saveMyProfilePic(req: NextRequest) {
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
    const profilePicCrop = body?.profilePicCrop;

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

    if (!isSafeProfileImageBlobName(originalBlobName)) {
      return NextResponse.json(
        { error: "originalBlobName not allowed" },
        { status: 400 }
      );
    }

    if (!isSafeProfileImageBlobName(croppedBlobName)) {
      return NextResponse.json(
        { error: "croppedBlobName not allowed" },
        { status: 400 }
      );
    }

    if (!isValidProfilePicCrop(profilePicCrop)) {
      return NextResponse.json(
        { error: "Invalid profilePicCrop" },
        { status: 400 }
      );
    }

    // get old values first so we can delete them after saving
    const old = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profilePic: true,
        profilePicOriginal: true,
      },
    });

    const oldBlobsToDelete = [old?.profilePic, old?.profilePicOriginal].filter(
      (x): x is string =>
        typeof x === "string" &&
        x.trim().length > 0 &&
        x !== DEFAULT_PROFILE_PIC &&
        x !== originalBlobName &&
        x !== croppedBlobName
    );

    // 1) Update DB first 
    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePic: croppedBlobName,
        profilePicOriginal: originalBlobName,
        profilePicCrop: profilePicCrop,
      },
    });

    // 2) Keep denormalized profilePic in sync
    await prisma.post.updateMany({
      where: { userId },
      data: { profilePic: croppedBlobName },
    });

    await prisma.comment.updateMany({
      where: { userId },
      data: { profilePic: croppedBlobName },
    });

    // 3) Best-effort delete old blobs
    for (const blobName of oldBlobsToDelete) {
      await tryDeleteBlob(blobName);
    }

    return NextResponse.json(
      { success: true, profilePic: croppedBlobName },
      { status: 200 }
    );
  } catch (error) {
    console.error("Save profilePic error:", error);
    return NextResponse.json(
      { error: "Internal server error; save profilePic" },
      { status: 500 }
    );
  }
}
