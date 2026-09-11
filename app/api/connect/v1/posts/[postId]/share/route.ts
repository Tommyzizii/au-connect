import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { requireAccountVerification } from "@/lib/accountVerification";

function normalizePair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

// Keep error responses consistent within this route without introducing a
// project-wide response abstraction.
function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    // Identify the sender from the authenticated request, never from client data.
    const senderId = getAuthUserIdFromReq(req);

    // Only users whose verification status is APPROVED may share internally.
    const verificationError = await requireAccountVerification(senderId);
    if (verificationError) return verificationError;

    // Read and normalize the action data supplied by the client.
    const { postId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    const rawRecipientIds: unknown[] = Array.isArray(body.recipientIds)
      ? body.recipientIds
      : [];
    const recipientIds: string[] = Array.from(
      // Duplicate recipient IDs still represent one delivery destination.
      new Set(
        rawRecipientIds.filter(
          (id: unknown): id is string => typeof id === "string" && id.length > 0,
        ),
      ),
    );

    // Reject malformed requests before reading or changing application data.
    if (!postId) return error("postId is required", 400);
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return error("A valid idempotencyKey is required", 400);
    }
    if (!recipientIds.length || recipientIds.length > 50) {
      return error("Select between 1 and 50 recipients", 400);
    }
    if (recipientIds.includes(senderId)) {
      return error("You cannot share a post with yourself", 400);
    }

    const previous = await prisma.internalShareAction.findUnique({
      where: { idempotencyKey },
      select: { senderId: true, postId: true, recipientIds: true },
    });

    // A retry of the same completed action returns success without sending again.
    if (previous) {
      const sameRecipients =
        [...previous.recipientIds].sort().join(",") ===
        [...recipientIds].sort().join(",");
      if (previous.senderId !== senderId || previous.postId !== postId || !sameRecipients) {
        return error("Idempotency key was already used for another share", 409);
      }
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { shareCount: true },
      });
      return NextResponse.json({
        success: true,
        shareCount: currentPost?.shareCount ?? 0,
        deliveredCount: previous.recipientIds.length,
        idempotentReplay: true,
      });
    }

    // Removed or missing posts cannot be shared.
    const post = await prisma.post.findFirst({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { id: true, userId: true, visibility: true },
    });
    if (!post) return error("Post not found or unavailable", 404);


    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds }, accountStatus: "ACTIVE" },
      select: { id: true },
    });

    // Atomic delivery requires every selected recipient to exist and be active.
    if (recipients.length !== recipientIds.length) {
      return error("One or more recipients are unavailable", 400);
    }

    if (post.visibility === "only-me") {
      return error("This post cannot be shared with other users", 403);
    }
    // For friends-only posts, every recipient must be connected to the author.
    if (post.visibility === "friends") {
      const authorConnections = await prisma.connection.findMany({
        where: {
          OR: [
            { userAId: post.userId, userBId: { in: recipientIds } },
            { userBId: post.userId, userAId: { in: recipientIds } },
          ],
        },
        select: { userAId: true, userBId: true },
      });
      const allowed = new Set(
        // A connection stores the two users in normalized A/B positions.
        authorConnections.map((connection) =>
          connection.userAId === post.userId
            ? connection.userBId
            : connection.userAId,
        ),
      );

      // If one recipient lacks access, reject the entire share action.
      if (recipientIds.some((id) => id !== post.userId && !allowed.has(id))) {
        return error("One or more recipients cannot access this post", 403);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdMessages = [];

      for (const receiverId of recipientIds) {
        const pair = normalizePair(senderId, receiverId);

        const participants = {
          participantAActorType: "USER" as const,
          participantAUserId: pair.userAId,
          participantBActorType: "USER" as const,
          participantBUserId: pair.userBId,
        };
        const selection = { id: true, userAId: true, participantAUserId: true } as const;
        // Match actor-aware conversations first, then legacy user pairs.
        const existing = await tx.conversation.findFirst({
          where: participants,
          select: selection,
        });
        const legacy = existing ?? await tx.conversation.findFirst({
          where: pair,
          select: selection,
        });
        const conversation = legacy ?? await tx.conversation.create({
          data: { ...pair, ...participants },
          select: selection,
        });

        // Store a reference to the original post instead of copying its content.
        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId,
            receiverId,
            sharedPostId: postId,
            kind: "SHARED_POST",
          },
          select: { id: true, conversationId: true, createdAt: true },
        });
        // Increment the unread count belonging to the receiving participant.
        const unreadField =
          receiverId === (conversation.participantAUserId ?? conversation.userAId) ? "userAUnreadCount" : "userBUnreadCount";
        await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: message.createdAt,
            lastMessageText: "Shared a post",
            lastMessageSenderId: senderId,
            [unreadField]: { increment: 1 },
          },
        });
        createdMessages.push(message);
      }

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
        select: { shareCount: true },
      });
      await tx.internalShareAction.create({
        data: {
          idempotencyKey,
          senderId,
          postId,
          recipientIds,
        },
      });
      return { messages: createdMessages, shareCount: updatedPost.shareCount };
    });

    return NextResponse.json({
      success: true,
      shareCount: result.shareCount,
      deliveredCount: result.messages.length,
      idempotentReplay: false,
    });
  } catch (caught) {
    if (caught instanceof Error && caught.message === "Unauthorized") {
      return error("Unauthorized", 401);
    }
    if (
      caught instanceof Prisma.PrismaClientKnownRequestError &&
      caught.code === "P2002"
    ) {
      return error("This share action is already being processed", 409);
    }
    console.error("Internal share failed:", caught);
    return error("Failed to share post", 500);
  }
}
