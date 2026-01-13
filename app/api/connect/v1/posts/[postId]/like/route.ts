import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// like or unlike a post
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }
    const params = await context.params;
    const postId = params.postId;

    const existingLike = await prisma.postInteraction.findUnique({
      where: {
        userId_postId_type: {
          userId,
          postId,
          type: "LIKE",
        },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      if (existingLike) {
        // UNLIKE
        await tx.postInteraction.delete({
          where: { id: existingLike.id },
        });

        const post = await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });

        return { isLiked: false, likeCount: post.likeCount };
      } else {
        // LIKE
        await tx.postInteraction.create({
          data: {
            userId,
            postId,
            type: "LIKE",
          },
        });

        const post = await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });

        return { isLiked: true, likeCount: post.likeCount };
      }
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Toggle like failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
