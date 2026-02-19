// app/api/connect/v1/messages/[conversationId]/clear/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await ctx.params;
    const authUserId = getAuthUserIdFromReq(req);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conv) return jsonError("Conversation not found", 404);
    if (conv.userAId !== authUserId && conv.userBId !== authUserId) return jsonError("Unauthorized", 403);

    await prisma.message.deleteMany({ where: { conversationId } });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: null,
        lastMessageText: null,
        lastMessageSenderId: null,
        userAUnreadCount: 0,
        userBUnreadCount: 0,
        userALastReadAt: null,
        userBLastReadAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
