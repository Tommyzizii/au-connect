import { NextResponse, NextRequest } from "next/server";
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";
import { CreatePostSchema, EditPostSchema } from "@/zod/PostSchema";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import { POSTS_PER_FETCH, SAS_TOKEN_EXPIRE_DURATION } from "./constants";
import { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";
import { requireAccountVerification } from "@/lib/accountVerification";
import {
  getSkillNamesFromJobSkills,
  normalizeSkillNames,
  syncJobSkills,
} from "@/lib/jobSkillFunctions";
import { getManagedCommunity } from "@/lib/communityAuth";
import type { Prisma } from "@/lib/generated/prisma";

export async function createPost(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const verificationError = await requireAccountVerification(userId);
    if (verificationError) return verificationError;

    // parsing body with zod
    const body = await req.json();
    const parsed = CreatePostSchema.safeParse(body);

    if (!parsed.success) {
      console.error("ZOD ERROR:", parsed.error.flatten());
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    // separating certain data
    const { pollDuration, job, actorType, communityId, ...data } = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        email: userEmail,
      },
      select: { username: true, profilePic: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Problem fetching user data to create post" },
        { status: 400 },
      );
    }

    const activeActorType = actorType === "COMMUNITY" ? "COMMUNITY" : "USER";
    const community =
      activeActorType === "COMMUNITY" && communityId
        ? await getManagedCommunity(userId, communityId)
        : null;

    if (activeActorType === "COMMUNITY" && !community) {
      return NextResponse.json(
        { error: "Unauthorized to post as this community" },
        { status: 403 },
      );
    }

    const displayName = community?.name ?? user.username;
    const displayProfilePic = community
      ? community.profilePic && community.profilePic.trim() !== ""
        ? community.profilePic
        : "/default_profile.jpg"
      : user.profilePic && user.profilePic.trim() !== ""
        ? user.profilePic
        : "/default_profile.jpg";

    // handle post duration
    const pollData: any = {};
    if (data.postType === "poll") {
      pollData.pollOptions = data.pollOptions || [];
      pollData.pollVotes = {}; // Initialize empty votes

      // Calculate poll end date
      if (pollDuration) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + pollDuration);
        pollData.pollEndsAt = endDate;
      }
    }

    const post = await prisma.$transaction(async (tx) => {
      // 🔹 Build Post payload safely
      const basePost = await tx.post.create({
        data: {
          userId,
          username: displayName,
          profilePic: displayProfilePic,
          actorType: activeActorType,
          communityId: community?.id ?? null,

          postType: data.postType,
          visibility: data.visibility,
          title: data.title,
          content: data.content,
          commentsDisabled: data.commentsDisabled,

          media: data.media ?? [],
          mediaTypes: extractMediaTypes(data.media ?? []),
          links: data.links ?? [],
          hasLinks: computeHasLinks(data.links ?? []),

          // Poll handling
          pollOptions: data.postType === "poll" ? (data.pollOptions ?? []) : [],
          pollVotes: data.postType === "poll" ? {} : undefined,
          pollEndsAt:
            data.postType === "poll" && pollDuration
              ? new Date(Date.now() + pollDuration * 24 * 60 * 60 * 1000)
              : undefined,
        },
      });

      // 🔹 If job post → create JobPost record
      if (data.postType === "job_post" && job) {
        const createdJobPost = await tx.jobPost.create({
          data: {
            postId: basePost.id,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            location: job.location,
            locationType: job.locationType,
            employmentType: job.employmentType,
            positionsAvailable: job.positionsAvailable ?? 1,
            status: job.status ?? "OPEN",
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            deadline: job.deadline ? new Date(job.deadline) : undefined,
            jobDetails: job.jobDetails,
            applyUrl: job.applyUrl,
            allowExternalApply: job.allowExternalApply,
          },
        });

        await syncJobSkills(
          tx,
          createdJobPost.id,
          normalizeSkillNames(job.jobSkills ?? job.jobRequirements),
        );
      }

      return basePost;
    });

    if (Array.isArray(post.media)) {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY,
      );
      const media = post.media as PostMedia[];

      try {
        const mediaWithUrls: PostMediaWithUrl[] = media.map((mediaItem) => {
          const sasToken = generateBlobSASQueryParameters(
            {
              containerName: AZURE_STORAGE_CONTAINER_NAME,
              blobName: mediaItem.blobName,
              permissions: BlobSASPermissions.parse("r"),
              expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
            },
            sharedKeyCredential,
          ).toString();

          const thumbnailUrl = mediaItem.thumbnailBlobName
            ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.thumbnailBlobName}?${generateBlobSASQueryParameters(
                {
                  containerName: AZURE_STORAGE_CONTAINER_NAME,
                  blobName: mediaItem.thumbnailBlobName,
                  permissions: BlobSASPermissions.parse("r"),
                  expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
                },
                sharedKeyCredential,
              ).toString()}`
            : undefined;

          return {
            ...mediaItem,
            url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
            thumbnailUrl: thumbnailUrl,
          };
        });

        // assign the new post's media with the attached urls
        const createdPostWithUrlsAttached = {
          ...post,
          media: mediaWithUrls,
        };

        return NextResponse.json(createdPostWithUrlsAttached, { status: 201 });
      } catch (sasError) {
        console.error("SAS TOKEN GENERATION ERROR:", sasError);
        return NextResponse.json(
          { error: "Failed to generate media access URLs" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(post, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getPosts(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");
    const feed = req.nextUrl.searchParams.get("feed");
    const communityId = req.nextUrl.searchParams.get("communityId");
    const interactionActorType = req.nextUrl.searchParams.get("actorType");
    const interactionCommunityId =
      req.nextUrl.searchParams.get("actorCommunityId");
    const isCommunityFeed = feed === "community";

    if (communityId && !/^[a-f\d]{24}$/i.test(communityId)) {
      return NextResponse.json(
        { error: "A valid community ID is required" },
        { status: 400 },
      );
    }

    const interactionCommunity =
      interactionActorType === "COMMUNITY" && interactionCommunityId
        ? await getManagedCommunity(userId, interactionCommunityId)
        : null;

    const interactionWhere: Prisma.PostInteractionWhereInput =
      interactionActorType === "COMMUNITY" && interactionCommunity
        ? {
            actorType: "COMMUNITY",
            communityId: interactionCommunity.id,
            type: { in: ["LIKE"] },
          }
        : {
            actorType: "USER",
            userId,
            type: { in: ["LIKE", "SAVED"] },
          };

    // Fetch posts
    const posts = await prisma.post.findMany({
      take: POSTS_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),

      orderBy: { createdAt: "desc" },
      // get comment count
      include: {
        _count: {
          select: {
            comments: true,
          },
        },
        // get likes and shares
        interactions: {
          where: interactionWhere,
          select: {
            id: true,
            type: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
          },
        },
        jobPost: {
          include: {
            jobSkills: {
              include: {
                skill: true,
              },
            },
            applications: {
              where: { applicantId: userId },
              select: { status: true },
              take: 1,
            },
          },
        },
      },
      where: {
        actorType: isCommunityFeed
          ? "COMMUNITY"
          : { in: ["USER", "COMMUNITY"] },
        ...(isCommunityFeed && communityId ? { communityId } : {}),
        moderationStatus: "VISIBLE",
        ...(isCommunityFeed ? {} : { jobPost: { is: null } }),
      },
    });

    // adding comments count from _count
    const postWithCommentCount = posts.map((post) => {
      const isLiked = post.interactions.some(
        (interaction) => interaction.type === "LIKE",
      );

      const isSaved = post.interactions.some(
        (interaction) => interaction.type === "SAVED",
      );
      const hasApplied = (post.jobPost?.applications?.length ?? 0) > 0;
      const applicationStatus = post.jobPost?.applications?.[0]?.status;

      return {
        ...post,
        isLiked,
        isSaved,
        numOfComments: post._count.comments,
        jobPost: post.jobPost
          ? {
              ...post.jobPost,
              jobRequirements: getSkillNamesFromJobSkills(post.jobPost.jobSkills),
              jobSkills: undefined,
              remainingPositions:
                post.jobPost.positionsAvailable - post.jobPost.positionsFilled,
              hasApplied,
              applicationStatus,
              applications: undefined,
            }
          : null,
      };
    });

    // Azure credential (reuse for all media)
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY,
    );

    // Attach signed URLs
    const postsWithMedia = postWithCommentCount.map((post) => {
      if (!post.media || !Array.isArray(post.media)) {
        return post;
      }

      // 🔒 Cast JSON → typed array (safe if YOU control writes)
      const media = post.media as PostMedia[];

      const mediaWithUrls: PostMediaWithUrl[] = media.map((mediaItem) => {
        const sasToken = generateBlobSASQueryParameters(
          {
            containerName: AZURE_STORAGE_CONTAINER_NAME,
            blobName: mediaItem.blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
          },
          sharedKeyCredential,
        ).toString();

        return {
          ...mediaItem,
          url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
        };
      });

      return {
        ...post,
        media: mediaWithUrls,
      };
    });

    // Return render-ready posts
    return NextResponse.json({
      posts: postsWithMedia,
      nextCursor: posts.length ? posts[posts.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching posts" },
      { status: 500 },
    );
  }
}

export async function editPost(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const postId = req.nextUrl.searchParams.get("postId");
    const body = await req.json();
    const requestActorType = body?.actorType;
    const requestCommunityId =
      typeof body?.communityId === "string" ? body.communityId : null;

    console.log("EDIT POST BODY:", JSON.stringify(body, null, 2));

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 },
      );
    }

    // parsing body with zod
    const parsed = EditPostSchema.safeParse(body);

    if (!parsed.success) {
      console.error("ZOD ERROR:", parsed.error.flatten());
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { pollDuration, job, ...data } = parsed.data;

    // Check if post exists and belongs to user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: {
        userId: true,
        actorType: true,
        communityId: true,
        media: true,
        pollVotes: true,
        postType: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const exsistingPostType = existingPost.postType;
    if (exsistingPostType !== data.postType) {
      return NextResponse.json(
        { error: "Cannot edit to different post type" },
        { status: 403 },
      );
    }

    const actingAsPostCommunity =
      requestActorType === "COMMUNITY" &&
      !!existingPost.communityId &&
      requestCommunityId === existingPost.communityId;

    const canEditCommunityPost =
      existingPost.actorType === "COMMUNITY" &&
      existingPost.communityId &&
      actingAsPostCommunity &&
      (await getManagedCommunity(userId, existingPost.communityId));

    if (existingPost.actorType !== "COMMUNITY" && existingPost.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to edit this post" },
        { status: 403 },
      );
    }

    if (existingPost.actorType !== "COMMUNITY" && requestActorType === "COMMUNITY") {
      return NextResponse.json(
        { error: "Switch to your personal profile before editing this post" },
        { status: 403 },
      );
    }

    if (existingPost.actorType === "COMMUNITY" && !canEditCommunityPost) {
      return NextResponse.json(
        { error: "Switch to this community page before editing this post" },
        { status: 403 },
      );
    }

    // 🔒 Prevent editing poll structure after votes exist
    if (
      data.postType === "poll" &&
      existingPost.pollVotes &&
      typeof existingPost.pollVotes === "object" &&
      !Array.isArray(existingPost.pollVotes)
    ) {
      const hasVotes = Object.keys(existingPost.pollVotes).length > 0;

      if (hasVotes) {
        delete data.pollOptions;
      }
    }

    // Handle blob deletion if media changed
    if (existingPost.media && Array.isArray(existingPost.media)) {
      const oldMedia = existingPost.media as PostMedia[];
      const newMedia = (data.media || []) as PostMedia[];

      // Find blobs that were removed
      const oldBlobNames = oldMedia.map((m) => m.blobName);
      const newBlobNames = newMedia.map((m) => m.blobName);
      const blobsToDelete = oldBlobNames.filter(
        (name) => !newBlobNames.includes(name),
      );

      // Also check for thumbnails
      const oldThumbnails = oldMedia
        .filter((m) => m.thumbnailBlobName)
        .map((m) => m.thumbnailBlobName!);
      const newThumbnails = newMedia
        .filter((m) => m.thumbnailBlobName)
        .map((m) => m.thumbnailBlobName!);
      const thumbnailsToDelete = oldThumbnails.filter(
        (name) => !newThumbnails.includes(name),
      );

      // Delete removed blobs from Azure
      if (blobsToDelete.length > 0 || thumbnailsToDelete.length > 0) {
        const sharedKeyCredential = new StorageSharedKeyCredential(
          AZURE_STORAGE_ACCOUNT_NAME,
          AZURE_STORAGE_ACCOUNT_KEY,
        );
        const blobServiceClient = new BlobServiceClient(
          `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          sharedKeyCredential,
        );
        const containerClient = blobServiceClient.getContainerClient(
          AZURE_STORAGE_CONTAINER_NAME,
        );

        // Delete main blobs
        for (const blobName of blobsToDelete) {
          try {
            await containerClient.deleteBlob(blobName);
          } catch (error) {
            console.error(`Failed to delete blob ${blobName}:`, error);
          }
        }

        // Delete thumbnails
        for (const thumbName of thumbnailsToDelete) {
          try {
            await containerClient.deleteBlob(thumbName);
          } catch (error) {
            console.error(`Failed to delete thumbnail ${thumbName}:`, error);
          }
        }
      }
    }

    if (data.media) {
      assertCompleteMedia(data.media);
    }

    // Update the post

    const updatedPost = await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          ...data,

          ...(data.media !== undefined && {
            mediaTypes: extractMediaTypes(data.media),
          }),

          ...(data.links !== undefined && {
            hasLinks: computeHasLinks(data.links),
          }),

          ...(pollDuration && {
            pollEndsAt: new Date(Date.now() + pollDuration * 86400000),
          }),

          updatedAt: new Date(),
        },
      });

      if (data.postType === "job_post" && job) {
        const updatedJobPost = await tx.jobPost.upsert({
          where: { postId },
          update: {
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            location: job.location,
            locationType: job.locationType,
            employmentType: job.employmentType,
            positionsAvailable: job.positionsAvailable,
            status: job.status,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            deadline: job.deadline ? new Date(job.deadline) : null,
            jobDetails: job.jobDetails,
            applyUrl: job.applyUrl,
            allowExternalApply: job.allowExternalApply,
          },
          create: {
            postId,
            jobTitle: job.jobTitle,
            companyName: job.companyName,
            location: job.location,
            locationType: job.locationType,
            employmentType: job.employmentType,
            positionsAvailable: job.positionsAvailable ?? 1,
            status: job.status ?? "OPEN",
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            deadline: job.deadline ? new Date(job.deadline) : null,
            jobDetails: job.jobDetails,
            applyUrl: job.applyUrl,
            allowExternalApply: job.allowExternalApply,
          },
        });

        if (job.jobSkills !== undefined || job.jobRequirements !== undefined) {
          await syncJobSkills(
            tx,
            updatedJobPost.id,
            normalizeSkillNames(job.jobSkills ?? job.jobRequirements),
          );
        }
      }

      // 🔥 FETCH AGAIN AFTER UPSERT
      return tx.post.findUnique({
        where: { id: postId },
        include: {
          jobPost: {
            include: {
              jobSkills: {
                include: {
                  skill: true,
                },
              },
            },
          },
        },
      });
    });

    if (!updatedPost) {
      return NextResponse.json(
        { error: "Internal server error; fetching posts" },
        { status: 500 },
      );
    }

    const updatedPostWithCompatibleJob = {
      ...updatedPost,
      jobPost: updatedPost.jobPost
        ? {
            ...updatedPost.jobPost,
            jobRequirements: getSkillNamesFromJobSkills(
              updatedPost.jobPost.jobSkills,
            ),
            jobSkills: undefined,
          }
        : null,
    };

    // Generate SAS tokens for media if present
    if (Array.isArray(updatedPostWithCompatibleJob.media)) {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY,
      );
      const media = updatedPostWithCompatibleJob.media as PostMedia[];

      try {
        const mediaWithUrls: PostMediaWithUrl[] = media.map((mediaItem) => {
          const sasToken = generateBlobSASQueryParameters(
            {
              containerName: AZURE_STORAGE_CONTAINER_NAME,
              blobName: mediaItem.blobName,
              permissions: BlobSASPermissions.parse("r"),
              expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
            },
            sharedKeyCredential,
          ).toString();

          // generate thumbnail url if exists
          const thumbnailUrl = mediaItem.thumbnailBlobName
            ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.thumbnailBlobName}?${generateBlobSASQueryParameters(
                {
                  containerName: AZURE_STORAGE_CONTAINER_NAME,
                  blobName: mediaItem.thumbnailBlobName,
                  permissions: BlobSASPermissions.parse("r"),
                  expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
                },
                sharedKeyCredential,
              ).toString()}`
            : undefined;

          return {
            ...mediaItem,
            url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
            thumbnailUrl: thumbnailUrl,
          };
        });

        // to mutate exisiting post return media with urls
        return NextResponse.json(
          { ...updatedPostWithCompatibleJob, media: mediaWithUrls },
          { status: 200 },
        );
      } catch (sasError) {
        console.error("SAS TOKEN GENERATION ERROR:", sasError);
        return NextResponse.json(
          { error: "Failed to generate media access URLs" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(updatedPostWithCompatibleJob, { status: 200 });
  } catch (error) {
    console.error("Error editing post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function assertCompleteMedia(media: any[]) {
  for (const m of media) {
    if (
      !m.blobName ||
      !m.type ||
      !m.name ||
      !m.mimetype ||
      typeof m.size !== "number"
    ) {
      throw new Error(`Invalid media object: ${JSON.stringify(m)}`);
    }
  }
}

export async function deletePost(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const postId = req.nextUrl.searchParams.get("postId");
    const requestActorType = req.nextUrl.searchParams.get("actorType");
    const requestCommunityId = req.nextUrl.searchParams.get("actorCommunityId");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 },
      );
    }

    // Check ownership + get media
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        userId: true,
        actorType: true,
        communityId: true,
        media: true,
        jobPost: {
          select: { id: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const actingAsPostCommunity =
      requestActorType === "COMMUNITY" &&
      !!post.communityId &&
      requestCommunityId === post.communityId;

    const canDeleteCommunityPost =
      post.actorType === "COMMUNITY" &&
      post.communityId &&
      actingAsPostCommunity &&
      (await getManagedCommunity(userId, post.communityId));

    if (post.actorType !== "COMMUNITY" && post.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this post" },
        { status: 403 },
      );
    }

    if (post.actorType !== "COMMUNITY" && requestActorType === "COMMUNITY") {
      return NextResponse.json(
        { error: "Switch to your personal profile before deleting this post" },
        { status: 403 },
      );
    }

    if (post.actorType === "COMMUNITY" && !canDeleteCommunityPost) {
      return NextResponse.json(
        { error: "Switch to this community page before deleting this post" },
        { status: 403 },
      );
    }

    // -------------------------
    // Delete Azure blobs first
    // -------------------------

    if (post.media && Array.isArray(post.media)) {
      const media = post.media as PostMedia[];

      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY,
      );

      const blobServiceClient = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        sharedKeyCredential,
      );

      const containerClient = blobServiceClient.getContainerClient(
        AZURE_STORAGE_CONTAINER_NAME,
      );

      await Promise.all(
        media.map(async (mediaItem) => {
          try {
            await containerClient.deleteBlob(mediaItem.blobName);

            if (mediaItem.thumbnailBlobName) {
              await containerClient.deleteBlob(mediaItem.thumbnailBlobName);
            }
          } catch (err) {
            console.error("Blob delete failed:", err);
          }
        }),
      );
    }

    // -------------------------
    // DATABASE DELETE TRANSACTION
    // -------------------------

    await prisma.$transaction(async (tx) => {
      // delete job applications
      if (post.jobPost) {
        await tx.jobApplication.deleteMany({
          where: { jobPostId: post.jobPost.id },
        });

        await tx.jobSkill.deleteMany({
          where: { jobPostId: post.jobPost.id },
        });

        await tx.jobPost.delete({
          where: { id: post.jobPost.id },
        });
      }

      // delete replies first
      await tx.comment.deleteMany({
        where: {
          postId,
          parentId: { not: null },
        },
      });

      // delete parent comments
      await tx.comment.deleteMany({
        where: {
          postId,
          parentId: null,
        },
      });

      // delete interactions
      await tx.postInteraction.deleteMany({
        where: { postId },
      });

      // delete post
      await tx.post.delete({
        where: { id: postId },
      });
    });

    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete post error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function extractMediaTypes(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  const types = media
    .map((m: any) => m?.type)
    .filter((t: any) => typeof t === "string" && t.trim().length > 0)
    .map((t: string) => t.trim().toLowerCase());

  // unique
  return Array.from(new Set(types));
}

function computeHasLinks(links: unknown): boolean {
  if (!links) return false;

  // your schema stores links as Json? and you currently write links: [] by default
  if (Array.isArray(links)) return links.length > 0;

  // if someday you store an object instead of array
  if (typeof links === "object") return Object.keys(links as any).length > 0;

  return false;
}
