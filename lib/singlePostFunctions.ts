import { NextRequest, NextResponse } from "next/server";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import { SAS_TOKEN_EXPIRE_DURATION } from "./constants";
import { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";
import { getSkillNamesFromJobSkills } from "@/lib/jobSkillFunctions";
import { getManagedCommunity } from "@/lib/communityAuth";
import type { Prisma } from "@/lib/generated/prisma";

export async function getSinglePost(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    // get postId from params
    const { postId } = params;
    const interactionActorType = req.nextUrl.searchParams.get("actorType");
    const interactionCommunityId =
      req.nextUrl.searchParams.get("actorCommunityId");

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
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

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
          },
        },

        _count: {
          select: {
            comments: true,
          },
        },

        interactions: {
          where: interactionWhere,
          select: {
            id: true,
            type: true,
          },
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
            jobDetails: true,
            jobSkills: {
              select: {
                skill: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            applyUrl: true,
            allowExternalApply: true,

            positionsAvailable: true,
            positionsFilled: true,

            _count: {
              select: {
                applications: true,
              },
            },

            applications: {
              where: {
                applicantId: userId,
              },
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!post || (post.moderationStatus === "REMOVED" && post.userId !== userId)) {
      return NextResponse.json(
        { error: "Internal server error; post(single) is not found!" },
        { status: 404 },
      );
    }

    // after fetching post
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY,
    );

    let mediaWithUrls: PostMediaWithUrl[] | null = post.media as PostMediaWithUrl[] | null;
    if (post.media && Array.isArray(post.media)) {
      mediaWithUrls = (post.media as PostMedia[]).map((mediaItem) => {
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
          thumbnailUrl: mediaItem.thumbnailBlobName
            ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.thumbnailBlobName}?${generateBlobSASQueryParameters(
                {
                  containerName: AZURE_STORAGE_CONTAINER_NAME,
                  blobName: mediaItem.thumbnailBlobName,
                  permissions: BlobSASPermissions.parse("r"),
                  expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
                },
                sharedKeyCredential,
              ).toString()}`
            : undefined,
        };
      });
    }

    const isLiked = post.interactions.some(
      (interaction) => interaction.type === "LIKE",
    );

    const isSaved = post.interactions.some(
      (interaction) => interaction.type === "SAVED",
    );

    const jobPostWithStatus = post.jobPost
      ? {
          ...post.jobPost,
          jobRequirements: getSkillNamesFromJobSkills(post.jobPost.jobSkills),
          jobSkills: undefined,

          positionsFilled: post.jobPost.positionsFilled,

          remainingPositions:
            post.jobPost.positionsAvailable - post.jobPost.positionsFilled,

          hasApplied: post.jobPost.applications.length > 0,
          applicationStatus: post.jobPost.applications[0]?.status ?? null,
        }
      : null;

    return NextResponse.json({
      ...post,
      removedByModeration: post.moderationStatus === "REMOVED",
      media: mediaWithUrls,

      username:
        post.actorType === "COMMUNITY"
          ? (post.community?.name ?? post.username)
          : post.user.username,
      profilePic:
        post.actorType === "COMMUNITY"
          ? post.community?.profilePic || "/default_profile.jpg"
          : post.user.profilePic,

      isLiked,
      isSaved,
      numOfComments: post._count.comments,

      jobPost: jobPostWithStatus,
    });
  } catch (error) {
    console.error("Failed to fetch post single:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching post; single" },
      { status: 500 },
    );
  }
}
