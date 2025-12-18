import { NextResponse, NextRequest } from "next/server";
import prisma from "./prisma";

import { getHeaderUserInfo } from "./authFunctions";
import { CreatePostSchema } from "@/zod/PostSchema";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

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
        profilePic: user.profilePic ?? "",
        ...data, // title, content, media
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

type PostMedia = {
  blobName: string;
  type: string;
  name: string;
  mimeType: string;
  size: number;
};

type PostMediaWithUrl = PostMedia & {
  url: string;
};

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

    // 1️⃣ Fetch posts
    const posts = await prisma.post.findMany({
      take: 10,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: "desc" },
    });

    // 2️⃣ Azure credential (reuse for all media)
    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );

    // 3️⃣ Attach signed URLs
    const postsWithMedia = posts.map((post) => {
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
            expiresOn: new Date(Date.now() + 10 * 60 * 1000),
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

    // 4️⃣ Return render-ready posts
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
