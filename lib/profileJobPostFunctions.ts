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

function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

type JobTab = "hiring" | "saved" | "applied";

const JOBPOST_SELECT = {
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
};

export async function getProfileJobPosts(req: NextRequest, profileUserId: string) {
  try {
    const [userEmail, viewerUserId] = getHeaderUserInfo(req);

    if (!userEmail || !viewerUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedProfileUserId = decodeURIComponent(profileUserId).trim();
    if (!normalizedProfileUserId || !isValidObjectId(normalizedProfileUserId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    if (cursor && !isValidObjectId(cursor)) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }

    const rawJobTab = (req.nextUrl.searchParams.get("jobTab") || "hiring").toLowerCase();
    const jobTab: JobTab = (["hiring", "saved", "applied"].includes(rawJobTab)
      ? rawJobTab
      : "hiring") as JobTab;

    // 🔒 Owner-only backend enforcement
    const isOwner = normalizedProfileUserId === viewerUserId;
    if (!isOwner && (jobTab === "saved" || jobTab === "applied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Base filters
    const whereAND: any[] = [
      { jobPost: { isNot: null } },
      { postType: "job_post" }, // keep if your app really uses this exact string
    ];

    if (jobTab === "hiring") {
      whereAND.push({ userId: normalizedProfileUserId });
    }

    if (jobTab === "saved") {
      whereAND.push({
        interactions: { some: { userId: viewerUserId, type: "SAVED" } },
      });
    }

    if (jobTab === "applied") {
      whereAND.push({
        jobPost: {
          is: {
            applications: { some: { applicantId: viewerUserId } },
          },
        },
      });
    }

    const posts = await prisma.post.findMany({
      where: { AND: whereAND },
      take: POSTS_PER_FETCH,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
        interactions: {
          where: { userId: viewerUserId, type: { in: ["LIKE", "SAVED"] } },
          select: { type: true },
        },
        jobPost: {
          select: {
            ...JOBPOST_SELECT,
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
                applications: undefined,
              },
            }
          : {}),
      };
    });

    // ✅ Media SAS URLs (unchanged)
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );

    const postsWithMedia = postsEnriched.map((post) => {
      if (!post.media || !Array.isArray(post.media)) return post;

      const media = post.media as PostMedia[];
      const mediaWithUrls: PostMediaWithUrl[] = media.map((m) => {
        const sasToken = generateBlobSASQueryParameters(
          {
            containerName: AZURE_STORAGE_CONTAINER_NAME,
            blobName: m.blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
          },
          sharedKeyCredential
        ).toString();

        const thumbnailUrl = m.thumbnailBlobName
          ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${m.thumbnailBlobName}?${generateBlobSASQueryParameters(
              {
                containerName: AZURE_STORAGE_CONTAINER_NAME,
                blobName: m.thumbnailBlobName,
                permissions: BlobSASPermissions.parse("r"),
                expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
              },
              sharedKeyCredential
            ).toString()}`
          : undefined;

        return {
          ...m,
          url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${m.blobName}?${sasToken}`,
          thumbnailUrl,
        };
      });

      return { ...post, media: mediaWithUrls };
    });

    return NextResponse.json({
      posts: postsWithMedia,
      nextCursor: posts.length ? posts[posts.length - 1].id : null,
    });
  } catch (err) {
    console.error("Error fetching profile job posts:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
