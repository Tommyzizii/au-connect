import prisma from "@/lib/prisma";
import { PostMedia } from "@/types/PostMedia";
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

  let mediaWithUrls = post.media;
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

  return {
    ...post,

    media: mediaWithUrls,

    username: post.user.username,
    profilePic: post.user.profilePic,

    isSaved: post.interactions.length > 0,

    jobPost: post.jobPost
      ? {
          ...post.jobPost,

          hasApplied: post.jobPost.applications.length > 0,

          applicationStatus: post.jobPost.applications[0]?.status ?? null,
        }
      : null,
  };
}
