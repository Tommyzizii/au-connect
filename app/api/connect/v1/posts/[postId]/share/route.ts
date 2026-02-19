import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { createNotification } from "@/lib/server/notifications.server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { postId } = await context.params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is missing from params" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id: postId },
        data: {
          shareCount: { increment: 1 },
        },
        select: {
          userId: true,
          shareCount: true,
        },
      });

      //  Create notification (if not sharing own post)
      if (post.userId !== userId) {
        await createNotification({
          userId: post.userId,   // post owner
          fromUserId: userId,    // who shared
          type: "POST_SHARED",
          entityId: postId,
        });
      }

      return { success: true, shareCount: post.shareCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error tracking share:", error);
    return NextResponse.json(
      { error: "Failed to track share" },
      { status: 500 },
    );
  }
}
