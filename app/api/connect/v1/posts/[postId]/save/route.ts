import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { NextRequest, NextResponse } from "next/server";
import { PostInteractionType } from "@/lib/generated/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    console.log("Server API is being called");
    // user validation
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    // fetcing post id from params
    const { postId } = await context.params;

    const existing = await prisma.postInteraction.findUnique({
      where: {
        userId_postId_type: {
          userId,
          postId,
          type: PostInteractionType.SAVED,
        },
      },
    });

    // UNSAVE
    if (existing) {
      await prisma.$transaction([
        prisma.postInteraction.delete({
          where: { id: existing.id },
        }),

        prisma.post.update({
          where: { id: postId },
          data: {
            savedCount: { decrement: 1 },
          },
        }),
      ]);

      return NextResponse.json({
        saved: false,
      });
    }

    // SAVE
    await prisma.$transaction([
      prisma.postInteraction.create({
        data: {
          userId,
          postId,
          type: PostInteractionType.SAVED,
        },
      }),

      prisma.post.update({
        where: { id: postId },
        data: {
          savedCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      saved: true,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to toggle save" },
      { status: 500 },
    );
  }
}
