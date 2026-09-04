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
import { getSkillNamesFromJobSkills } from "@/lib/jobSkillFunctions";

export async function getPostWithMedia(postId: string, currentUserId: string) {
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
      interactions: {
        where: {
          actorType: "USER",
          userId: currentUserId,
          type: "SAVED",
        },
        select: {
          id: true,
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

  if (post.moderationStatus === "REMOVED" && post.userId !== currentUserId) {
    return null;
  }

  if (post.userId !== currentUserId && post.visibility === "only-me") {
    return null;
  }
  if (post.userId !== currentUserId && post.visibility === "friends") {
    const pair =
      post.userId < currentUserId
        ? { userAId: post.userId, userBId: currentUserId }
        : { userAId: currentUserId, userBId: post.userId };
    const connection = await prisma.connection.findUnique({
      where: { userAId_userBId: pair },
      select: { id: true },
    });
    if (!connection) return null;
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
      return result;
    });
  }

  return {
    ...post,
    removedByModeration: post.moderationStatus === "REMOVED",
    media: mediaWithUrls,
    links: post.links as LinkEmbed[] | null,
    pollVotes: post.pollVotes as Record<string, string[]> | undefined,
    pollOptions: post.pollOptions ?? null,
    pollEndsAt: post.pollEndsAt ?? undefined,
    username:
      post.actorType === "COMMUNITY"
        ? (post.community?.name ?? post.username)
        : post.user.username,
    profilePic:
      post.actorType === "COMMUNITY"
        ? post.community?.profilePic || "/default_profile.jpg"
        : post.user.profilePic,
    isSaved: post.interactions.length > 0,
    jobPost: post.jobPost
      ? {
          ...post.jobPost,
          jobRequirements: getSkillNamesFromJobSkills(post.jobPost.jobSkills),
          jobSkills: undefined,
          positionsFilled: post.jobPost._count.applications,
          remainingPositions:
            post.jobPost.positionsAvailable - post.jobPost._count.applications,
          hasApplied: post.jobPost.applications.length > 0,
          applicationStatus: post.jobPost.applications[0]?.status ?? null,
        }
      : null,
  };
}

/** Build a short-lived, read-only SAS URL for a single blob. */
export function buildBlobReadSasUrl(blobName: string): string {
  const sharedKeyCredential = new StorageSharedKeyCredential(
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY,
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: AZURE_STORAGE_CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
    },
    sharedKeyCredential,
  ).toString();

  return `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${blobName}?${sasToken}`;
}

/** blobName of the first previewable image for a post's media, or null. */
export function firstImageBlobName(media: unknown): string | null {
  if (!Array.isArray(media) || media.length === 0) return null;
  const first = media[0] as PostMedia;
  // Videos carry an image poster in thumbnailBlobName; images use blobName.
  return first.thumbnailBlobName ?? first.blobName ?? null;
}

/*
 * Minimal, public-safe post data for the social share preview. Only ever
 * returns VISIBLE posts and exposes just what the OG card needs — no
 * comments, interactions, or viewer-specific fields.
 */
export async function getPublicPostPreview(postId: string) {
  return prisma.post.findFirst({
    where: {
      id: postId,
      moderationStatus: "VISIBLE",
      OR: [{ visibility: "everyone" }, { visibility: null }],
    },
    select: {
      id: true,
      username: true,
      profilePic: true,
      title: true,
      content: true,
      media: true,
    },
  });
}
