// app/api/connect/v1/messages/[conversationId]/message/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await ctx.params;
    const authUserId = getAuthUserIdFromReq(req);

    if (!conversationId || !messageId) return jsonError("Missing parameters", 400);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        userAId: true,
        userBId: true,
        userALastReadAt: true,
        userBLastReadAt: true,
        userAUnreadCount: true,
        userBUnreadCount: true,
      },
    });

    if (!conv) return jsonError("Conversation not found", 404);
    if (conv.userAId !== authUserId && conv.userBId !== authUserId) return jsonError("Unauthorized", 403);

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true, conversationId: true, createdAt: true, text: true },
    });

    if (!msg || msg.conversationId !== conversationId) return jsonError("Message not found", 404);
    if (msg.senderId !== authUserId) return jsonError("Only sender can delete this message", 403);

    // Delete the message
    await prisma.message.delete({ where: { id: messageId } });

    // Find new latest message (for preview + lastMessageAt)
    const latest = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, text: true, senderId: true },
    });

    // Optional: adjust unread count if this deleted message was unread for receiver
    // (only if you are using userAUnreadCount/userBUnreadCount)
    let data: any = {
      lastMessageAt: latest?.createdAt ?? null,
      lastMessageText: latest?.text ?? null,
      lastMessageSenderId: latest?.senderId ?? null,
    };

    const receiverId = msg.receiverId;
    const receiverIsA = conv.userAId === receiverId;
    const receiverLastReadAt = receiverIsA ? conv.userALastReadAt : conv.userBLastReadAt;

    const wasUnread =
      receiverId &&
      (receiverLastReadAt ? msg.createdAt > receiverLastReadAt : true);

    if (wasUnread) {
      if (receiverIsA) {
        data.userAUnreadCount = Math.max((conv.userAUnreadCount ?? 0) - 1, 0);
      } else {
        data.userBUnreadCount = Math.max((conv.userBUnreadCount ?? 0) - 1, 0);
      }
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
