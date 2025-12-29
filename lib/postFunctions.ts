import { NextResponse, NextRequest } from "next/server";
import prisma from "./prisma";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

import { getHeaderUserInfo } from "./authFunctions";
import { CreatePostSchema } from "@/zod/PostSchema";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import { POSTS_PER_FETCH, SAS_TOKEN_EXPIRE_DURATION } from "./constants";
import { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";

export async function createPost(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // parsing body with zod
    const parsed = CreatePostSchema.safeParse(body);

    if (!parsed.success) {
      console.error("ZOD ERROR:", parsed.error.flatten());
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

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
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        userId,
        username: user.username,
        profilePic: user.profilePic ?? null,
        ...data, // title, content, media
      },
    });

    if (Array.isArray(post.media)) {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT_NAME,
        AZURE_STORAGE_ACCOUNT_KEY
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
            sharedKeyCredential
          ).toString();

          return {
            ...mediaItem,
            url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
          };
        });

        // assign the new post's media with the attached urls 
        const createdPostWithUrlsAttached = {
          ...post,
          media: mediaWithUrls
        }

        return NextResponse.json(createdPostWithUrlsAttached, { status: 201 });
      } catch (sasError) {
        console.error("SAS TOKEN GENERATION ERROR:", sasError);
        return NextResponse.json(
          { error: "Failed to generate media access URLs" },
          { status: 500 }
        );
      }

    } else {
      return NextResponse.json(post, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


export async function getPosts(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");

    // Fetch posts
    const posts = await prisma.post.findMany({
      take: POSTS_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            comments: true,
          }
        },
        interactions: {
          where: {
            userId: userId,
            type: "LIKE",
          },
          select: { id: true }
        }
      }
    });

    // adding comments count from _count
    const postWithCommentCount = posts.map((post) => ({
      ...post,
      isLiked: post.interactions.length > 0,
      numOfComments: post._count.comments,
    }));

    // Azure credential (reuse for all media)
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
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
          sharedKeyCredential
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
      { status: 500 }
    );
  }
}
