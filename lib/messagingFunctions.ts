import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

function normalizePair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getMyReadField(conv: { userAId: string; userBId: string }, me: string) {
  return conv.userAId === me ? "userALastReadAt" : "userBLastReadAt";
}

/* =========================
   GET MY INBOX (with unreadCount)
   GET /api/connect/v1/messages/inbox
========================= */
export async function getMyInbox(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromReq(req);

    // 1) Conversations (now includes unread + last preview)
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: authUserId }, { userBId: authUserId }] },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        userAId: true,
        userBId: true,

        lastMessageAt: true,
        lastMessageText: true,
        lastMessageSenderId: true,

        userAUnreadCount: true,
        userBUnreadCount: true,
      },
    });

    if (!conversations.length) {
      return NextResponse.json({ data: [] });
    }

    // 2) Batch fetch “other user”
    const otherUserIds = conversations.map((c) =>
      c.userAId === authUserId ? c.userBId : c.userAId
    );

    const users = await prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, username: true, title: true, profilePic: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 3) Build inbox rows (no message table queries)
    const inbox = conversations
      .map((c) => {
        const otherUserId = c.userAId === authUserId ? c.userBId : c.userAId;
        const user = userMap.get(otherUserId);
        if (!user) return null;

        const unreadCount =
          c.userAId === authUserId ? c.userAUnreadCount : c.userBUnreadCount;

        const lastPrefix =
          c.lastMessageSenderId && c.lastMessageSenderId === authUserId ? "You: " : "";

        const lastMessageText =
          c.lastMessageText ? `${lastPrefix}${c.lastMessageText}` : null;

        return {
          user,
          conversationId: c.id,
          lastMessageAt: c.lastMessageAt,
          lastMessageText,
          unreadCount: unreadCount ?? 0,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data: inbox });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* =========================
   GET OR CREATE CONVERSATION
   POST /api/connect/v1/messages/conversation/with/:otherUserId
========================= */
export async function getOrCreateConversation(
  req: NextRequest,
  otherUserId: string
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);

    if (!otherUserId)
      return jsonError("otherUserId required", 400);

    if (otherUserId === authUserId)
      return jsonError("Cannot message yourself", 400);

    const pair = normalizePair(authUserId, otherUserId);

    // Anyone can message anyone

    // Check if conversation already exists
    const existing = await prisma.conversation.findUnique({
      where: {
        userAId_userBId: {
          userAId: pair.userAId,
          userBId: pair.userBId,
        },
      },
      select: { id: true },
    });

    const conversation =
      existing ??
      (await prisma.conversation.create({
        data: {
          userAId: pair.userAId,
          userBId: pair.userBId,

          lastMessageAt: null,
          lastMessageText: null,
          lastMessageSenderId: null,

          userALastReadAt: null,
          userBLastReadAt: null,

          userAUnreadCount: 0,
          userBUnreadCount: 0,
        },
        select: { id: true },
      }));

    return NextResponse.json({
      data: { conversationId: conversation.id },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


/* =========================
   MARK CONVERSATION AS READ
   POST /api/connect/v1/messages/:conversationId/read
========================= */
export async function markConversationRead(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conv) return jsonError("Conversation not found", 404);
    if (conv.userAId !== authUserId && conv.userBId !== authUserId) {
      return jsonError("Unauthorized", 403);
    }

    const isUserA = conv.userAId === authUserId;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: isUserA
        ? { userALastReadAt: new Date(), userAUnreadCount: 0 }
        : { userBLastReadAt: new Date(), userBUnreadCount: 0 },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


/* =========================
   GET MESSAGES
   GET /api/connect/v1/messages/:conversationId
     - no params       => latest 50 (ASC)
     - ?cursor=ISO     => newer than cursor (ASC)  [append]
     - ?before=ISO     => older than before (ASC)  [prepend]
========================= */
export async function getMessages(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conv) return jsonError("Conversation not found", 404);
    if (conv.userAId !== authUserId && conv.userBId !== authUserId) {
      return jsonError("Unauthorized", 403);
    }

    const cursorStr = req.nextUrl.searchParams.get("cursor"); // fetch newer than this
    const beforeStr = req.nextUrl.searchParams.get("before"); // fetch older than this

    // Don’t allow both at once (ambiguous)
    if (cursorStr && beforeStr) {
      return jsonError("Use only one of 'cursor' or 'before'", 400);
    }

    const cursorDate = cursorStr ? new Date(cursorStr) : null;
    const beforeDate = beforeStr ? new Date(beforeStr) : null;

    if (cursorDate && isNaN(cursorDate.getTime())) {
      return jsonError("Invalid cursor date", 400);
    }
    if (beforeDate && isNaN(beforeDate.getTime())) {
      return jsonError("Invalid before date", 400);
    }

    const PAGE_SIZE = 50;

    // CASE A) append newer (polling)
    if (cursorDate) {
      const messages = await prisma.message.findMany({
        where: { conversationId, createdAt: { gt: cursorDate } },
        orderBy: { createdAt: "asc" },
        take: PAGE_SIZE,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          text: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ data: messages });
    }

    // CASE B) load older (reverse infinite scroll)
    // We query DESC to get the closest older chunk efficiently, then reverse to ASC for UI.
    if (beforeDate) {
      const olderDesc = await prisma.message.findMany({
        where: { conversationId, createdAt: { lt: beforeDate } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          text: true,
          createdAt: true,
        },
      });

      const messages = olderDesc.reverse(); // back to ASC
      return NextResponse.json({ data: messages });
    }

    // CASE C) initial load => latest 50 (ASC)
    // Query DESC (latest) then reverse to ASC for UI.
    const latestDesc = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        text: true,
        createdAt: true,
      },
    });

    const messages = latestDesc.reverse(); // ASC for rendering
    return NextResponse.json({ data: messages });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


/* =========================
   SEND MESSAGE
   POST /api/connect/v1/messages/:conversationId
========================= */
export async function sendMessage(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conv) return jsonError("Conversation not found", 404);
    if (conv.userAId !== authUserId && conv.userBId !== authUserId) {
      return jsonError("Unauthorized", 403);
    }

    const receiverId = conv.userAId === authUserId ? conv.userBId : conv.userAId;

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return jsonError("Message text is required", 400);

    // decide which unread field to increment (receiver side)
    const incField = receiverId === conv.userAId ? "userAUnreadCount" : "userBUnreadCount";

    const result = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: { conversationId, senderId: authUserId, receiverId, text },
        select: { id: true, senderId: true, receiverId: true, text: true, createdAt: true },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: msg.createdAt,
          lastMessageText: msg.text ?? null,
          lastMessageSenderId: authUserId,
          [incField]: { increment: 1 },
        },
      });

      return msg;
    });

    return NextResponse.json({ data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
