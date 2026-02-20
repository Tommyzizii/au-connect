import { NextRequest, NextResponse } from "next/server";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { REPLIES_PER_FETCH, TOP_LEVEL_COMMENTS_FETCH_LIMIT } from "./constants";
import { CreateCommentSchema } from "@/zod/CommentSchema";
import { createNotification } from "@/lib/server/notifications.server";


// function to create comments/replies
const MAX_COMMENT_DEPTH = 2; // 0,1,2 = 3 layers total

export async function createComments(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { postId } = params;

    const body = await req.json();
    const parsed = CreateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed" },
        { status: 400 },
      );
    }

    const { content, parentCommentId } = parsed.data;

    // get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, profilePic: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // 🔥 DEPTH CHECK
    let depth = 0;
    let currentParentId = parentCommentId;

    while (currentParentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      if (!parent) break;

      depth++;
      currentParentId = parent.parentId || "";

      if (depth > MAX_COMMENT_DEPTH) {
        return NextResponse.json(
          { error: "Max reply depth reached" },
          { status: 400 },
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        parentId: parentCommentId ?? null,
        content: content.trim(),

        userId: user.id,
        username: user.username,
        profilePic: user.profilePic || "/default_profile.jpg",
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
      },
    });


    // ===============================
    // 🔔 Notification Logic
    // ===============================

    // If this is a reply
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { userId: true },
      });

      if (
        parentComment &&
        parentComment.userId !== user.id
      ) {
        await createNotification({
          userId: parentComment.userId, // original comment owner
          fromUserId: user.id,          // who replied
          type: "COMMENT_REPLIED",
          entityId: comment.id,
        });
      }
    } else {
      // This is a normal comment on post
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });

      if (post && post.userId !== user.id) {
        await createNotification({
          userId: post.userId,          // post owner
          fromUserId: user.id,          // who commented
          type: "POST_COMMENTED",
          entityId: postId,
        });
      }
    }

    return NextResponse.json({
      ...comment,
      replyCount: 0,
    });


  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getCommentsForPost(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const { postId } = params;
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor"); // last comment id for pagination

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { commentsDisabled: true },
    });

    if (post && post.commentsDisabled) {
      return NextResponse.json(
        { error: "comments for this posts are disabled" },
        { status: 400 },
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
      }),
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
      { status: 500 },
    );
  }
}

// Fixed getRepliesForComment in your comments API file.
// The key fix: fetch REPLIES_PER_FETCH + 1 items, if we get that many
// there are more pages. Return only REPLIES_PER_FETCH and set cursor.
// If we get fewer, nextCursor is null → hasNextPage = false.

export async function getRepliesForComment(
  req: NextRequest,
  params: { postId: string; commentId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { postId, commentId } = params;

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "postId and commentId are required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { commentsDisabled: true },
    });

    if (post?.commentsDisabled) {
      return NextResponse.json(
        { error: "Comments for this post are disabled" },
        { status: 400 },
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");

    // Fetch one extra so we know if there's a next page
    const replies = await prisma.comment.findMany({
      where: { postId, parentId: commentId },
      take: REPLIES_PER_FETCH + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: "asc" },
    });

    const hasMore = replies.length > REPLIES_PER_FETCH;
    const pageReplies = hasMore ? replies.slice(0, REPLIES_PER_FETCH) : replies;

    return NextResponse.json({
      replies: pageReplies,
      // Only set a cursor when there are genuinely more items to fetch
      nextCursor: hasMore ? pageReplies[pageReplies.length - 1].id : null,
    });
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching replies" },
      { status: 500 },
    );
  }
}