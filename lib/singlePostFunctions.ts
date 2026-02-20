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
import { PostMedia } from "@/types/PostMedia";

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

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: true,

        _count: {
          select: {
            comments: true,
          },
        },

        interactions: {
          where: {
            userId: userId,
            type: {
              in: ["LIKE", "SAVED"],
            },
          },
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
            jobRequirements: true,
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

    if (!post) {
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

    let mediaWithUrls: PostMedia[] | null = post.media as PostMedia[] | null;
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

          positionsFilled: post.jobPost.positionsFilled,

          remainingPositions:
            post.jobPost.positionsAvailable - post.jobPost.positionsFilled,

          hasApplied: post.jobPost.applications.length > 0,
          applicationStatus: post.jobPost.applications[0]?.status ?? null,
        }
      : null;

    return NextResponse.json({
      ...post,
      media: mediaWithUrls,

      username: post.user.username,
      profilePic: post.user.profilePic,

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
