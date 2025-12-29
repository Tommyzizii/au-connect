import { NextRequest, NextResponse } from "next/server";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { REPLIES_PER_FETCH, TOP_LEVEL_COMMENTS_FETCH_LIMIT } from "./constants";

// function to create comments/replies
export async function createComments(
  req: NextRequest,
  params: { postId: string }
) {
  try {
    // valideate user info from headers
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    // grab postId from params and content from body
    const { postId } = params;
    const { content, parentId } = await req.json();

    if (!content || !content.trim()) {
      return new Response("Content is required", { status: 400 });
    }

    // grab user info from db
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, profilePic: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Internal Server Error; Failed to retrieve user information or user not found",
        },
        { status: 401 }
      );
    }

    // create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        content: content.trim(),
        parentId: parentId ?? null,

        // denormalized user info
        userId: user.id,
        username: user.username,
        profilePic: user.profilePic || "",
      },
    });

    // increment comment count on post
    await prisma.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.log(
      err instanceof Error
        ? err.message
        : "Internal Server Error; Something went wrong while creating comment"
    );
  }
}

export async function getCommentsForPost(
  req: NextRequest,
  params: { postId: string }
) {
  try {
    const { postId } = params;
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor"); // last comment id for pagination

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    // Fetch top-level comments only (parentId = null)
    const topComments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: "desc" },
      take: TOP_LEVEL_COMMENTS_FETCH_LIMIT,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        replies: {
          take: REPLIES_PER_FETCH,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Return comments along with reply count
    const commentsWithReplyCount = await Promise.all(
      topComments.map(async (comment) => {
        const totalReplies = await prisma.comment.count({
          where: { parentId: comment.id },
        });

        return {
          ...comment,
          replyCount: totalReplies,
        };
      })
    );

    return NextResponse.json({
      comments: commentsWithReplyCount,
      nextCursor: commentsWithReplyCount.length
        ? commentsWithReplyCount[commentsWithReplyCount.length - 1].id
        : null,
    });
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function getRepliesForComment(
  req: NextRequest,
  params: { postId: string; commentId: string }
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const { postId, commentId } = params;
    const cursor = req.nextUrl.searchParams.get("cursor");

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "postId and commentId are required" },
        { status: 400 }
      );
    }

    const replies = await prisma.comment.findMany({
      where: {
        postId,
        parentId: commentId,
      },
      take: REPLIES_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: {
        createdAt: "asc", // oldest -> newest feels right for threads
      },
    });

    return NextResponse.json({
      replies,
      nextCursor: replies.length ? replies[replies.length - 1].id : null,
    });
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching replies" },
      { status: 500 }
    );
  }
}
