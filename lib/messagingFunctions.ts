// lib/messagingFunctions.ts
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

    const connections = await prisma.connection.findMany({
      where: { OR: [{ userAId: authUserId }, { userBId: authUserId }] },
      select: { userAId: true, userBId: true },
    });

    const friendIds = connections.map((c) =>
      c.userAId === authUserId ? c.userBId : c.userAId
    );

    if (!friendIds.length) return NextResponse.json({ data: [] });

    const friends = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, username: true, title: true, profilePic: true },
    });

    const pairs = friendIds.map((fid) => normalizePair(authUserId, fid));

    const convs = await prisma.conversation.findMany({
      where: {
        OR: pairs.map((p) => ({ userAId: p.userAId, userBId: p.userBId })),
      },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        lastMessageAt: true,
        userALastReadAt: true,
        userBLastReadAt: true,
      },
    });

    // otherUserId -> conv
    const convByOther = new Map<
      string,
      {
        id: string;
        userAId: string;
        userBId: string;
        lastMessageAt: Date | null;
        userALastReadAt: Date | null;
        userBLastReadAt: Date | null;
      }
    >();

    for (const c of convs) {
      const otherId = c.userAId === authUserId ? c.userBId : c.userAId;
      convByOther.set(otherId, c);
    }

    // last message per conversation (mongo-safe, N queries but ok for small lists)
    const lastMsgMap = new Map<
      string,
      { text: string | null; senderId: string; createdAt: Date }
    >();

    for (const c of convs) {
      const last = await prisma.message.findFirst({
        where: { conversationId: c.id },
        orderBy: { createdAt: "desc" },
        select: { text: true, senderId: true, createdAt: true },
      });
      if (last) lastMsgMap.set(c.id, last);
    }

    // unread count per conversation
    const unreadCountMap = new Map<string, number>();

    for (const c of convs) {
      const readField = getMyReadField(c, authUserId);
      const myLastReadAt =
        readField === "userALastReadAt" ? c.userALastReadAt : c.userBLastReadAt;

      const count = await prisma.message.count({
        where: {
          conversationId: c.id,
          receiverId: authUserId, // only messages sent TO ME
          ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
        },
      });

      unreadCountMap.set(c.id, count);
    }

    const inbox = friends
      .map((f) => {
        const conv = convByOther.get(f.id);
        const last = conv ? lastMsgMap.get(conv.id) : null;

        const lastPrefix = last && last.senderId === authUserId ? "You: " : "";
        const lastText = last?.text ?? null;

        return {
          user: f,
          conversationId: conv?.id ?? null,
          lastMessageAt: conv?.lastMessageAt ?? null,
          lastMessageText: lastText ? `${lastPrefix}${lastText}` : null,
          unreadCount: conv ? unreadCountMap.get(conv.id) ?? 0 : 0,
        };
      })
      .sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });

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
export async function getOrCreateConversation(req: NextRequest, otherUserId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!otherUserId) return jsonError("otherUserId required", 400);
    if (otherUserId === authUserId) return jsonError("Cannot message yourself", 400);

    const pair = normalizePair(authUserId, otherUserId);

    const isConnected = await prisma.connection.findFirst({
      where: { userAId: pair.userAId, userBId: pair.userBId },
      select: { id: true },
    });

    if (!isConnected) return jsonError("Not connected", 403);

    const existing = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: pair.userAId, userBId: pair.userBId } },
      select: { id: true },
    });

    const conversation =
      existing ??
      (await prisma.conversation.create({
        data: {
          userAId: pair.userAId,
          userBId: pair.userBId,
          lastMessageAt: null,
          userALastReadAt: null,
          userBLastReadAt: null,
        },
        select: { id: true },
      }));

    return NextResponse.json({ data: { conversationId: conversation.id } });
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

    const readField = getMyReadField(conv, authUserId);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        [readField]: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* =========================
   GET MESSAGES
   GET /api/connect/v1/messages/:conversationId?cursor=ISO_DATE
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

    const cursor = req.nextUrl.searchParams.get("cursor");
    const cursorDate = cursor ? new Date(cursor) : null;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(cursorDate ? { createdAt: { gt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        text: true,
        createdAt: true,
      },
    });

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

    const receiverId =
      conv.userAId === authUserId ? conv.userBId : conv.userAId;

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return jsonError("Message text is required", 400);

    const msg = await prisma.message.create({
      data: { conversationId, senderId: authUserId, receiverId, text },
      select: { id: true, senderId: true, receiverId: true, text: true, createdAt: true },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt },
    });

    return NextResponse.json({ data: msg });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
