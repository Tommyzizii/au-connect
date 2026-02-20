import prisma from "@/lib/prisma";
import { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";
import LinkEmbed from "@/types/LinkEmbeds";
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

export async function getPostWithMedia(postId: string, currentUserId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: true,
      interactions: {
        where: {
          userId: currentUserId,
          type: "SAVED",
        },
        select: {
          id: true,
        },
      },
      jobPost: {
        include: {
          applications: {
            where: {
              applicantId: currentUserId,
            },
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY,
  );

  let mediaWithUrls: PostMediaWithUrl[] | null = null;

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

      const result: PostMediaWithUrl = {
        ...mediaItem,
        url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
      };
      return result;
    });
  }

  return {
    ...post,
    media: mediaWithUrls,
    links: post.links as LinkEmbed[] | null,
    pollVotes: post.pollVotes as Record<string, string[]> | undefined,
    pollOptions: post.pollOptions ?? null,
    pollEndsAt: post.pollEndsAt ?? undefined,
    username: post.user.username,
    profilePic: post.user.profilePic,
    isSaved: post.interactions.length > 0,
    jobPost: post.jobPost
      ? {
          ...post.jobPost,
          positionsFilled: post.jobPost._count.applications,
          remainingPositions:
            post.jobPost.positionsAvailable - post.jobPost._count.applications,
          hasApplied: post.jobPost.applications.length > 0,
          applicationStatus: post.jobPost.applications[0]?.status ?? null,
        }
      : null,
  };
}