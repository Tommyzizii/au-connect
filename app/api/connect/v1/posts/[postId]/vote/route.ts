// app/api/posts/[postId]/vote/route.ts
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
    const { optionIndex } = await req.json();

    if (typeof optionIndex !== "number") {
      return NextResponse.json(
        { error: "Invalid option index" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        userId: true,
        pollOptions: true,
        pollVotes: true,
        pollEndsAt: true,
      },
    });

    if (!post || !post.pollOptions?.length) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    if (post.pollEndsAt && post.pollEndsAt < new Date()) {
      return NextResponse.json({ error: "Poll has ended" }, { status: 400 });
    }

    const votes = (post.pollVotes as Record<string, string[]>) || {};

    // 🔒 Prevent double voting
    const alreadyVoted = Object.values(votes).some((voters) =>
      voters.includes(userId),
    );

    if (alreadyVoted) {
      return NextResponse.json(
        { error: "User has already voted" },
        { status: 400 },
      );
    }

    const key = optionIndex.toString();
    const updatedVotes = {
      ...votes,
      [key]: [...(votes[key] || []), userId],
    };

    await prisma.post.update({
      where: { id: postId },
      data: {
        pollVotes: updatedVotes,
      },
    });

    // ===============================
    // CREATE NOTIFICATION
    // ===============================
    if (post.userId !== userId) {
      await createNotification({
        userId: post.userId,     // post owner
        fromUserId: userId,      // who voted
        type: "POST_VOTED",
        entityId: postId,
      });
    }

    return NextResponse.json(
      { success: true, pollVotes: updatedVotes },
      { status: 200 },
    );
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
