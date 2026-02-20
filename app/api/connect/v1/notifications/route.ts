import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            profilePic: true,
          },
        },
      },
    });

    const legacyJobApplicationEntityIds = notifications
      .filter((n) => n.type === "JOB_APPLICATION" && !!n.entityId)
      .map((n) => n.entityId as string);

    const legacyCommentReplyEntityIds = notifications
      .filter((n) => n.type === "COMMENT_REPLIED" && !!n.entityId)
      .map((n) => n.entityId as string);

    if (
      legacyJobApplicationEntityIds.length === 0 &&
      legacyCommentReplyEntityIds.length === 0
    ) {
      return NextResponse.json(notifications);
    }

    const [jobPosts, repliedComments] = await Promise.all([
      prisma.jobPost.findMany({
        where: { id: { in: legacyJobApplicationEntityIds } },
        select: { id: true, postId: true },
      }),
      prisma.comment.findMany({
        where: { id: { in: legacyCommentReplyEntityIds } },
        select: { id: true, postId: true },
      }),
    ]);

    const jobPostIdToPostId = new Map(jobPosts.map((j) => [j.id, j.postId]));
    const commentIdToPostId = new Map(
      repliedComments.map((comment) => [comment.id, comment.postId]),
    );

    const normalizedNotifications = notifications.map((notification) => {
      if (!notification.entityId) {
        return notification;
      }

      if (notification.type === "JOB_APPLICATION") {
        const postId = jobPostIdToPostId.get(notification.entityId);

        if (!postId) return notification;

        return {
          ...notification,
          entityId: postId,
        };
      }

      if (notification.type === "COMMENT_REPLIED") {
        const postId = commentIdToPostId.get(notification.entityId);

        // If entityId is already a post id, leave it unchanged.
        if (!postId) return notification;

        return {
          ...notification,
          entityId: postId,
        };
      }

      return notification;
    });

    return NextResponse.json(normalizedNotifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
