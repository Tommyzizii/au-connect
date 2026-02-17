import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/lib/env";
import { POSTS_PER_FETCH, SAS_TOKEN_EXPIRE_DURATION } from "@/lib/constants";
import type { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";

// Validate Mongo ObjectId
function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

type ProfileTab = "all" | "article" | "poll" | "images" | "videos" | "documents";

export async function getProfilePosts(req: NextRequest, profileUserId: string) {
  try {
    const [userEmail, viewerUserId] = getHeaderUserInfo(req);

    if (!userEmail || !viewerUserId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const normalizedProfileUserId = decodeURIComponent(profileUserId).trim();

    if (!normalizedProfileUserId || !isValidObjectId(normalizedProfileUserId)) {
      return NextResponse.json(
        {
          error: "Invalid userId",
          received: profileUserId,
          normalized: normalizedProfileUserId,
        },
        { status: 400 }
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");

    // ✅ NEW: default is "all" (matches your UI)
    const rawTab = (req.nextUrl.searchParams.get("tab") || "all").toLowerCase();
    const tab: ProfileTab = ([
      "all",
      "article",
      "poll",
      "images",
      "videos",
      "documents",
    ].includes(rawTab)
      ? rawTab
      : "all") as ProfileTab;

    //  mediaTypes filtering (you already have String[] field)
    const mediaTypeForTab =
      tab === "images"
        ? "image"
        : tab === "videos"
        ? "video"
        : tab === "documents"
        ? "file"
        : null;

    // ✅ Build where clause
    const whereClause: any = {
      userId: normalizedProfileUserId,
    };

    // ✅ NEW: postType filters
    if (tab === "article") {
      whereClause.postType = "article";
    } else if (tab === "poll") {
      whereClause.postType = "poll";
    }

    // ✅ Existing: media filter tabs
    if (mediaTypeForTab) {
      whereClause.mediaTypes = { has: mediaTypeForTab };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      take: POSTS_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },

        // ✅ include LIKE + SAVED so UI can show correct state
        interactions: {
          where: {
            userId: viewerUserId,
            type: { in: ["LIKE", "SAVED"] },
          },
          select: { type: true },
        },

        jobPost: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            location: true,
            locationType: true,
            employmentType: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            deadline: true,
            status: true,
            jobDetails: true,
            jobRequirements: true,
            applyUrl: true,
            allowExternalApply: true,

            applications: {
              where: { applicantId: viewerUserId },
              select: { status: true },
              take: 1,
            },
          },
        },
      },
    });

    const postsEnriched = posts.map((post) => {
      const isLiked = post.interactions?.some((i) => i.type === "LIKE") ?? false;
      const isSaved = post.interactions?.some((i) => i.type === "SAVED") ?? false;

      const hasApplied = (post.jobPost?.applications?.length ?? 0) > 0;
      const applicationStatus = post.jobPost?.applications?.[0]?.status;

      return {
        ...post,
        isLiked,
        isSaved,
        numOfComments: post._count.comments,

        ...(post.jobPost
          ? {
              jobPost: {
                ...post.jobPost,
                hasApplied,
                applicationStatus,
                applications: undefined, // prevent leaking extra array to client
              },
            }
          : {}),
      };
    });

    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );

    const postsWithMedia = postsEnriched.map((post) => {
      if (!post.media || !Array.isArray(post.media)) return post;

      const media = post.media as PostMedia[];

      const mediaWithUrls: PostMediaWithUrl[] = media.map((mediaItem) => {
        const sasToken = generateBlobSASQueryParameters(
          {
            containerName: AZURE_STORAGE_CONTAINER_NAME,
            blobName: mediaItem.blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
          },
          sharedKeyCredential
        ).toString();

        const thumbnailUrl = mediaItem.thumbnailBlobName
          ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.thumbnailBlobName}?${generateBlobSASQueryParameters(
              {
                containerName: AZURE_STORAGE_CONTAINER_NAME,
                blobName: mediaItem.thumbnailBlobName,
                permissions: BlobSASPermissions.parse("r"),
                expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
              },
              sharedKeyCredential
            ).toString()}`
          : undefined;

        return {
          ...mediaItem,
          url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
          thumbnailUrl,
        };
      });

      return { ...post, media: mediaWithUrls };
    });

    return NextResponse.json({
      posts: postsWithMedia,
      nextCursor: posts.length ? posts[posts.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching profile posts:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching profile posts" },
      { status: 500 }
    );
  }
}
