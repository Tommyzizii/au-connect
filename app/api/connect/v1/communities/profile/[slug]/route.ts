import { NextRequest, NextResponse } from "next/server";

import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { getManagedCommunity } from "@/lib/communityAuth";

type Params = {
  params: Promise<{ slug: string }>;
};

type CommunityProfilePatchBody = {
  actorType?: string;
  communityId?: string;
  name?: unknown;
  about?: unknown;
  location?: unknown;
  profilePic?: unknown;
  profilePicOriginal?: unknown;
  profilePicCrop?: unknown;
  coverPhoto?: unknown;
  coverPhotoOriginal?: unknown;
  coverPhotoCrop?: unknown;
};

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isSafeImageBlobName(value: unknown) {
  return (
    typeof value === "string" &&
    value.startsWith("images/") &&
    !value.includes("..") &&
    !value.startsWith("http://") &&
    !value.startsWith("https://")
  );
}

async function getAuthUserId(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;
  if (!token) return null;

  try {
    return verifyJwtToken(token).userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  try {
    const community = await prisma.community.findUnique({
      where: { slug: decodeURIComponent(slug) },
      select: {
        id: true,
        name: true,
        slug: true,
        about: true,
        location: true,
        profilePic: true,
        profilePicOriginal: true,
        profilePicCrop: true,
        coverPhoto: true,
        coverPhotoOriginal: true,
        coverPhotoCrop: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        managers: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        followers: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        _count: {
          select: {
            followers: true,
            posts: true,
            managers: true,
          },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    if (community.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This community page is archived and no longer available." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      community: {
        ...community,
        isManager: community.managers.length > 0,
        isFollowing: community.followers.length > 0,
        managers: undefined,
        followers: undefined,
      },
    });
  } catch (error) {
    console.error("Fetch community profile failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch community" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const existing = await prisma.community.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: { id: true, name: true, about: true, location: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Community not found" },
      { status: 404 },
    );
  }

  let body: CommunityProfilePatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body?.actorType !== "COMMUNITY" || body?.communityId !== existing.id) {
    return NextResponse.json(
      { error: "Switch to this community page before editing it" },
      { status: 403 },
    );
  }

  const managed = await getManagedCommunity(userId, existing.id);
  if (!managed) {
    return NextResponse.json(
      { error: "Unauthorized to update this community" },
      { status: 403 },
    );
  }

  try {
    const name =
      body?.name !== undefined
        ? normalizeText(body.name) ?? existing.name
        : existing.name;
    const about =
      body?.about !== undefined ? normalizeText(body.about) : existing.about;
    const location =
      body?.location !== undefined
        ? normalizeText(body.location)
        : existing.location;
    const profilePic = body?.profilePic;
    const profilePicOriginal = body?.profilePicOriginal;
    const profilePicCrop = body?.profilePicCrop;
    const coverPhoto = body?.coverPhoto;
    const coverPhotoOriginal = body?.coverPhotoOriginal;
    const coverPhotoCrop = body?.coverPhotoCrop;

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Community name is required" },
        { status: 400 },
      );
    }

      if (
        profilePic !== undefined &&
        profilePic !== null &&
        profilePic !== "" &&
        !isSafeImageBlobName(profilePic)
      ) {
        return NextResponse.json(
          { error: "Invalid profile image" },
          { status: 400 },
        );
      }

      if (
        profilePicOriginal !== undefined &&
        profilePicOriginal !== null &&
        profilePicOriginal !== "" &&
        !isSafeImageBlobName(profilePicOriginal)
      ) {
        return NextResponse.json(
          { error: "Invalid original profile image" },
          { status: 400 },
        );
      }

      if (
        coverPhoto !== undefined &&
        coverPhoto !== null &&
        coverPhoto !== "" &&
        !isSafeImageBlobName(coverPhoto)
      ) {
        return NextResponse.json(
          { error: "Invalid cover image" },
          { status: 400 },
        );
      }

      if (
        coverPhotoOriginal !== undefined &&
        coverPhotoOriginal !== null &&
        coverPhotoOriginal !== "" &&
        !isSafeImageBlobName(coverPhotoOriginal)
      ) {
        return NextResponse.json(
          { error: "Invalid original cover image" },
          { status: 400 },
        );
      }

      const community = await prisma.community.update({
        where: { id: existing.id },
        data: {
          name,
          about,
          location,
          ...(profilePic !== undefined && {
            profilePic: profilePic || null,
            profilePicOriginal:
              profilePicOriginal !== undefined
                ? profilePicOriginal || null
                : profilePic || null,
            profilePicCrop: profilePicCrop ?? null,
          }),
          ...(coverPhoto !== undefined && {
            coverPhoto: coverPhoto || null,
            coverPhotoOriginal:
              coverPhotoOriginal !== undefined
                ? coverPhotoOriginal || null
                : coverPhoto || null,
            coverPhotoCrop: coverPhotoCrop ?? null,
          }),
        },
      select: {
        id: true,
        name: true,
        slug: true,
        about: true,
        location: true,
        profilePic: true,
        profilePicOriginal: true,
        profilePicCrop: true,
        coverPhoto: true,
        coverPhotoOriginal: true,
        coverPhotoCrop: true,
        status: true,
        _count: {
          select: {
            followers: true,
            posts: true,
            managers: true,
          },
        },
      },
    });

    await prisma.post.updateMany({
      where: { actorType: "COMMUNITY", communityId: existing.id },
      data: {
        username: community.name,
        profilePic: community.profilePic || "/default_profile.jpg",
      },
    });

    await prisma.comment.updateMany({
      where: { actorType: "COMMUNITY", communityId: existing.id },
      data: {
        username: community.name,
        profilePic: community.profilePic || "/default_profile.jpg",
      },
    });

    return NextResponse.json({
      community: {
        ...community,
        isManager: true,
      },
    });
  } catch (error) {
    console.error("Update community profile failed:", error);
    return NextResponse.json(
      { error: "Failed to update community" },
      { status: 500 },
    );
  }
}
