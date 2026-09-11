import { NextRequest, NextResponse } from "next/server";
import { requireAccountVerification } from "@/lib/accountVerification";
import { getManagedCommunity, isValidObjectId } from "@/lib/communityAuth";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import prisma from "@/lib/prisma";
import { enforceMessageSendRateLimit } from "@/lib/server/messageRateLimit";
import type { ActorType, Prisma } from "@/lib/generated/prisma";


const messageSelect = {
  id: true,
  senderId: true,
  receiverId: true,
  senderActorType: true,
  senderCommunityId: true,
  receiverActorType: true,
  receiverCommunityId: true,
  text: true,
  kind: true,
  sharedPostId: true,
  sharedPost: {
    select: {
      id: true,
      userId: true,
      username: true,
      profilePic: true,
      actorType: true,
      communityId: true,
      community: { select: { name: true, profilePic: true } },
      postType: true,
      visibility: true,
      title: true,
      content: true,
      mediaTypes: true,
      moderationStatus: true,
    },
  },
  createdAt: true,
} satisfies Prisma.MessageSelect;

type SelectedMessage = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

async function hideUnavailableSharedPosts(messages: SelectedMessage[], viewerId: string) {
  const friendAuthorIds = Array.from(
    new Set(
      messages
        .map((message) => message.sharedPost)
        .filter((post) => post?.visibility === "friends" && post.userId !== viewerId)
        .map((post) => post!.userId),
    ),
  );
  const connections = friendAuthorIds.length
    ? await prisma.connection.findMany({
        where: {
          OR: [
            { userAId: viewerId, userBId: { in: friendAuthorIds } },
            { userBId: viewerId, userAId: { in: friendAuthorIds } },
          ],
        },
        select: { userAId: true, userBId: true },
      })
    : [];
  const connectedAuthorIds = new Set(
    connections.map((connection) =>
      connection.userAId === viewerId ? connection.userBId : connection.userAId,
    ),
  );

  return messages.map((message) => {
    const post = message.sharedPost;
    const unavailable =
      !post ||
      post.moderationStatus !== "VISIBLE" ||
      (post.visibility === "only-me" && post.userId !== viewerId) ||
      (post.visibility === "friends" &&
        post.userId !== viewerId &&
        !connectedAuthorIds.has(post.userId));
    return { ...message, sharedPost: unavailable ? null : post };
  });
}

const MAX_MESSAGE_TEXT_LENGTH = 4000;

type MessageActor = {
  type: ActorType;
  userId: string | null;
  communityId: string | null;
};

type ConversationAccess = {
  conversation: {
    id?: string;
    userAId: string | null;
    userBId: string | null;
    participantAActorType: ActorType | null;
    participantAUserId: string | null;
    participantACommunityId: string | null;
    participantBActorType: ActorType | null;
    participantBUserId: string | null;
    participantBCommunityId: string | null;
    userALastReadAt?: Date | null;
    userBLastReadAt?: Date | null;
    userAUnreadCount?: number | null;
    userBUnreadCount?: number | null;
  };
  currentSide: "A" | "B";
  currentActor: MessageActor;
  peerActor: MessageActor;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function errorStatus(message: string) {
  if (message === "Unauthorized") return 401;
  if (message.includes("Unauthorized")) return 403;
  if (
    message.includes("required") ||
    message.startsWith("Invalid") ||
    message.includes("Cannot message yourself") ||
    message.includes("too long")
  ) {
    return 400;
  }
  return 500;
}

function normalizePair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

function actorKey(actor: MessageActor) {
  return actor.type === "COMMUNITY"
    ? `COMMUNITY:${actor.communityId ?? ""}`
    : `USER:${actor.userId ?? ""}`;
}

function sameActor(a: MessageActor, b: MessageActor) {
  return actorKey(a) === actorKey(b);
}

function actorFromSide(
  conversation: ConversationAccess["conversation"],
  side: "A" | "B",
): MessageActor {
  if (side === "A") {
    return {
      type: conversation.participantAActorType ?? "USER",
      userId: conversation.participantAUserId ?? conversation.userAId ?? null,
      communityId: conversation.participantACommunityId ?? null,
    };
  }

  return {
    type: conversation.participantBActorType ?? "USER",
    userId: conversation.participantBUserId ?? conversation.userBId ?? null,
    communityId: conversation.participantBCommunityId ?? null,
  };
}

async function requestActor(req: NextRequest, authUserId: string) {
  const actorType = req.nextUrl.searchParams.get("actorType");
  const communityId = req.nextUrl.searchParams.get("communityId");

  if (actorType !== "COMMUNITY") {
    return { type: "USER" as ActorType, userId: authUserId, communityId: null };
  }

  if (!communityId) {
    throw new Error("communityId required");
  }

  if (!isValidObjectId(communityId)) {
    throw new Error("Invalid communityId");
  }

  const community = await getManagedCommunity(authUserId, communityId);
  if (!community) {
    throw new Error("Unauthorized to access this community inbox");
  }

  return { type: "COMMUNITY" as ActorType, userId: null, communityId };
}

async function getConversationAccess(
  req: NextRequest,
  conversationId: string,
  authUserId: string,
  includeCounts = false,
): Promise<ConversationAccess | NextResponse> {
  const currentActor = await requestActor(req, authUserId);
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      participantAActorType: true,
      participantAUserId: true,
      participantACommunityId: true,
      participantBActorType: true,
      participantBUserId: true,
      participantBCommunityId: true,
      userALastReadAt: includeCounts,
      userBLastReadAt: includeCounts,
      userAUnreadCount: includeCounts,
      userBUnreadCount: includeCounts,
    },
  });

  if (!conversation) return jsonError("Conversation not found", 404);

  const actorA = actorFromSide(conversation, "A");
  const actorB = actorFromSide(conversation, "B");

  if (sameActor(currentActor, actorA)) {
    return {
      conversation,
      currentSide: "A",
      currentActor,
      peerActor: actorB,
    };
  }

  if (sameActor(currentActor, actorB)) {
    return {
      conversation,
      currentSide: "B",
      currentActor,
      peerActor: actorA,
    };
  }

  return jsonError("Unauthorized", 403);
}

function actorWhere(actor: MessageActor): Prisma.ConversationWhereInput {
  if (actor.type === "COMMUNITY") {
    return {
      OR: [
        {
          participantAActorType: "COMMUNITY",
          participantACommunityId: actor.communityId,
        },
        {
          participantBActorType: "COMMUNITY",
          participantBCommunityId: actor.communityId,
        },
      ],
    };
  }

  return {
    OR: [
      { userAId: actor.userId },
      { userBId: actor.userId },
      { participantAActorType: "USER", participantAUserId: actor.userId },
      { participantBActorType: "USER", participantBUserId: actor.userId },
    ],
  };
}

/* =========================
   GET MY INBOX
   GET /api/connect/v1/messages/inbox?actorType=USER|COMMUNITY&communityId=...
========================= */
export async function getMyInbox(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const actor = await requestActor(req, authUserId);

    const conversations = await prisma.conversation.findMany({
      where: actorWhere(actor),
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        userAId: true,
        userBId: true,
        participantAActorType: true,
        participantAUserId: true,
        participantACommunityId: true,
        participantBActorType: true,
        participantBUserId: true,
        participantBCommunityId: true,
        lastMessageAt: true,
        lastMessageText: true,
        lastMessageSenderId: true,
        lastMessageSenderActorType: true,
        lastMessageSenderCommunityId: true,
        userAUnreadCount: true,
        userBUnreadCount: true,
        updatedAt: true,
      },
    });

    const peers = conversations.map((conversation) => {
      const actorA = actorFromSide(conversation, "A");
      const actorB = actorFromSide(conversation, "B");
      return sameActor(actor, actorA) ? actorB : actorA;
    });

    const userIds = peers
      .filter((peer) => peer.type === "USER" && peer.userId)
      .map((peer) => peer.userId as string);
    const communityIds = peers
      .filter((peer) => peer.type === "COMMUNITY" && peer.communityId)
      .map((peer) => peer.communityId as string);

    const [users, communities] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, title: true, profilePic: true },
          })
        : [],
      communityIds.length
        ? prisma.community.findMany({
            where: { id: { in: communityIds }, status: "ACTIVE" },
            select: { id: true, name: true, slug: true, about: true, profilePic: true },
          })
        : [],
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const communityMap = new Map(communities.map((community) => [community.id, community]));

    const inbox = conversations
      .map((conversation, index) => {
        const peer = peers[index];
        const isA = sameActor(actor, actorFromSide(conversation, "A"));
        const unreadCount = isA
          ? conversation.userAUnreadCount
          : conversation.userBUnreadCount;
        const lastSender: MessageActor = {
          type: conversation.lastMessageSenderActorType ?? "USER",
          userId: conversation.lastMessageSenderId ?? null,
          communityId: conversation.lastMessageSenderCommunityId ?? null,
        };
        const lastPrefix =
          conversation.lastMessageText && sameActor(actor, lastSender) ? "You: " : "";

        if (peer.type === "COMMUNITY" && peer.communityId) {
          const community = communityMap.get(peer.communityId);
          if (!community) return null;
          return {
            peer: {
              type: "COMMUNITY",
              id: community.id,
              name: community.name,
              subtitle: "Community page",
              profilePic: community.profilePic,
              slug: community.slug,
            },
            conversationId: conversation.id,
            lastMessageAt: conversation.lastMessageAt,
            lastMessageText: conversation.lastMessageText
              ? `${lastPrefix}${conversation.lastMessageText}`
              : null,
            unreadCount: unreadCount ?? 0,
            conversationUpdatedAt: conversation.updatedAt
              ? conversation.updatedAt.toISOString()
              : null,
          };
        }

        if (peer.type === "USER" && peer.userId) {
          const user = userMap.get(peer.userId);
          if (!user) return null;
          return {
            peer: {
              type: "USER",
              id: user.id,
              name: user.username,
              subtitle: user.title,
              profilePic: user.profilePic,
            },
            conversationId: conversation.id,
            lastMessageAt: conversation.lastMessageAt,
            lastMessageText: conversation.lastMessageText
              ? `${lastPrefix}${conversation.lastMessageText}`
              : null,
            unreadCount: unreadCount ?? 0,
            conversationUpdatedAt: conversation.updatedAt
              ? conversation.updatedAt.toISOString()
              : null,
          };
        }

        return null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const dedupedInbox = Array.from(
      inbox
        .reduce((rowsByPeer, row) => {
          const key = `${row.peer.type}:${row.peer.id}`;
          const existing = rowsByPeer.get(key);
          if (!existing) {
            rowsByPeer.set(key, row);
            return rowsByPeer;
          }

          const existingTime = existing.lastMessageAt
            ? new Date(existing.lastMessageAt).getTime()
            : 0;
          const rowTime = row.lastMessageAt
            ? new Date(row.lastMessageAt).getTime()
            : 0;

          if (rowTime > existingTime) rowsByPeer.set(key, row);
          return rowsByPeer;
        }, new Map<string, (typeof inbox)[number]>())
        .values(),
    );

    return NextResponse.json({ data: dedupedInbox });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

/* =========================
   GET OR CREATE USER CONVERSATION
========================= */
export async function getOrCreateConversation(req: NextRequest, otherUserId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const verificationError = await requireAccountVerification(authUserId);
    if (verificationError) return verificationError;

    if (!otherUserId) return jsonError("otherUserId required", 400);
    if (!isValidObjectId(otherUserId)) return jsonError("Invalid otherUserId", 400);
    const actor = await requestActor(req, authUserId);

    if (actor.type === "COMMUNITY") {
      const communityId = actor.communityId;
      if (!communityId) return jsonError("communityId required", 400);

      const user = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true },
      });
      if (!user) return jsonError("User not found", 404);

      const existing = await prisma.conversation.findFirst({
        where: {
          OR: [
            {
              participantAActorType: "USER",
              participantAUserId: otherUserId,
              participantBActorType: "COMMUNITY",
              participantBCommunityId: communityId,
            },
            {
              participantAActorType: "COMMUNITY",
              participantACommunityId: communityId,
              participantBActorType: "USER",
              participantBUserId: otherUserId,
            },
          ],
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        select: { id: true },
      });

      const conversation =
        existing ??
        (await prisma.conversation.create({
          data: {
            userAId: otherUserId,
            userBId: null,
            participantAActorType: "USER",
            participantAUserId: otherUserId,
            participantBActorType: "COMMUNITY",
            participantBCommunityId: communityId,
            userALastReadAt: null,
            userBLastReadAt: null,
            userAUnreadCount: 0,
            userBUnreadCount: 0,
          },
          select: { id: true },
        }));

      return NextResponse.json({ data: { conversationId: conversation.id } });
    }

    if (otherUserId === authUserId) return jsonError("Cannot message yourself", 400);

    const pair = normalizePair(authUserId, otherUserId);
    const existing = await prisma.conversation.findFirst({
      where: {
        participantAActorType: "USER",
        participantAUserId: pair.userAId,
        participantBActorType: "USER",
        participantBUserId: pair.userBId,
      },
      select: { id: true },
    });

    const legacy =
      existing ??
      (await prisma.conversation.findFirst({
        where: { userAId: pair.userAId, userBId: pair.userBId },
        select: { id: true },
      }));

    const conversation =
      legacy ??
      (await prisma.conversation.create({
        data: {
          userAId: pair.userAId,
          userBId: pair.userBId,
          participantAActorType: "USER",
          participantAUserId: pair.userAId,
          participantBActorType: "USER",
          participantBUserId: pair.userBId,
          userALastReadAt: null,
          userBLastReadAt: null,
          userAUnreadCount: 0,
          userBUnreadCount: 0,
        },
        select: { id: true },
      }));

    return NextResponse.json({ data: { conversationId: conversation.id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: errorStatus(msg) });
  }
}

/* =========================
   GET OR CREATE COMMUNITY CONVERSATION
========================= */
export async function getOrCreateCommunityConversation(
  req: NextRequest,
  communityId: string,
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const verificationError = await requireAccountVerification(authUserId);
    if (verificationError) return verificationError;

    if (!communityId) return jsonError("communityId required", 400);
    if (!isValidObjectId(communityId)) return jsonError("Invalid communityId", 400);

    const community = await prisma.community.findFirst({
      where: { id: communityId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!community) return jsonError("Community not found", 404);

    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          {
            participantAActorType: "USER",
            participantAUserId: authUserId,
            participantBActorType: "COMMUNITY",
            participantBCommunityId: communityId,
          },
          {
            participantAActorType: "COMMUNITY",
            participantACommunityId: communityId,
            participantBActorType: "USER",
            participantBUserId: authUserId,
          },
        ],
      },
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      select: { id: true },
    });

    const conversation =
      existing ??
      (await prisma.conversation.create({
        data: {
          userAId: authUserId,
          userBId: null,
          participantAActorType: "USER",
          participantAUserId: authUserId,
          participantBActorType: "COMMUNITY",
          participantBCommunityId: communityId,
          userALastReadAt: null,
          userBLastReadAt: null,
          userAUnreadCount: 0,
          userBUnreadCount: 0,
        },
        select: { id: true },
      }));

    return NextResponse.json({ data: { conversationId: conversation.id } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: errorStatus(msg) });
  }
}

export async function markConversationRead(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);
    if (!isValidObjectId(conversationId)) return jsonError("Invalid conversationId", 400);

    const access = await getConversationAccess(req, conversationId, authUserId);
    if (access instanceof NextResponse) return access;

    await prisma.conversation.update({
      where: { id: conversationId },
      data:
        access.currentSide === "A"
          ? { userALastReadAt: new Date(), userAUnreadCount: 0 }
          : { userBLastReadAt: new Date(), userBUnreadCount: 0 },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function getMessages(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);
    if (!isValidObjectId(conversationId)) return jsonError("Invalid conversationId", 400);

    const access = await getConversationAccess(req, conversationId, authUserId);
    if (access instanceof NextResponse) return access;

    const cursorStr = req.nextUrl.searchParams.get("cursor");
    const beforeStr = req.nextUrl.searchParams.get("before");
    if (cursorStr && beforeStr) return jsonError("Use only one of 'cursor' or 'before'", 400);

    const cursorDate = cursorStr ? new Date(cursorStr) : null;
    const beforeDate = beforeStr ? new Date(beforeStr) : null;
    if (cursorDate && isNaN(cursorDate.getTime())) return jsonError("Invalid cursor date", 400);
    if (beforeDate && isNaN(beforeDate.getTime())) return jsonError("Invalid before date", 400);

    const PAGE_SIZE = 50;

    if (cursorDate) {
      const messages = await prisma.message.findMany({
        where: { conversationId, createdAt: { gt: cursorDate } },
        orderBy: { createdAt: "asc" },
        take: PAGE_SIZE,
        select: messageSelect,
      });

      return NextResponse.json({ data: await hideUnavailableSharedPosts(messages, authUserId) });
    }

    if (beforeDate) {
      const olderDesc = await prisma.message.findMany({
        where: { conversationId, createdAt: { lt: beforeDate } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        select: messageSelect,
      });

      const messages = olderDesc.reverse(); // back to ASC
      return NextResponse.json({ data: await hideUnavailableSharedPosts(messages, authUserId) });
    }

    const latestDesc = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: messageSelect,
    });

    const messages = latestDesc.reverse(); // ASC for rendering
    return NextResponse.json({ data: await hideUnavailableSharedPosts(messages, authUserId) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function sendMessage(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);
    if (!isValidObjectId(conversationId)) return jsonError("Invalid conversationId", 400);

    const verificationError = await requireAccountVerification(authUserId);
    if (verificationError) return verificationError;

    const access = await getConversationAccess(req, conversationId, authUserId);
    if (access instanceof NextResponse) return access;

    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return jsonError("Message text is required", 400);
    if (text.length > MAX_MESSAGE_TEXT_LENGTH) {
      return jsonError(`Message text is too long. Limit is ${MAX_MESSAGE_TEXT_LENGTH} characters`, 400);
    }

    const rateLimitResponse = await enforceMessageSendRateLimit(access.currentActor);
    if (rateLimitResponse) return rateLimitResponse;

    const incField =
      access.currentSide === "A" ? "userBUnreadCount" : "userAUnreadCount";

    const result = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: authUserId,
          receiverId: access.peerActor.type === "USER" ? access.peerActor.userId : null,
          senderActorType: access.currentActor.type,
          senderCommunityId: access.currentActor.communityId,
          receiverActorType: access.peerActor.type,
          receiverCommunityId: access.peerActor.communityId,
          text,
        },
        select: messageSelect,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: msg.createdAt,
          lastMessageText: msg.text ?? null,
          lastMessageSenderId: authUserId,
          lastMessageSenderActorType: access.currentActor.type,
          lastMessageSenderCommunityId: access.currentActor.communityId,
          [incField]: { increment: 1 },
        },
      });

      return msg;
    });

    return NextResponse.json({ data: result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function getUnreadMessagesCount(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const actor = await requestActor(req, authUserId);

    const conversations = await prisma.conversation.findMany({
      where: actorWhere(actor),
      select: {
        userAId: true,
        userBId: true,
        participantAActorType: true,
        participantAUserId: true,
        participantACommunityId: true,
        participantBActorType: true,
        participantBUserId: true,
        participantBCommunityId: true,
        userAUnreadCount: true,
        userBUnreadCount: true,
      },
    });

    let count = 0;
    for (const conversation of conversations) {
      const isA = sameActor(actor, actorFromSide(conversation, "A"));
      count += isA
        ? (conversation.userAUnreadCount ?? 0)
        : (conversation.userBUnreadCount ?? 0);
    }

    return NextResponse.json({ count });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function deleteMessageForEveryone(
  req: NextRequest,
  conversationId: string,
  messageId: string,
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId || !messageId) return jsonError("Missing parameters", 400);
    if (!isValidObjectId(conversationId)) return jsonError("Invalid conversationId", 400);
    if (!isValidObjectId(messageId)) return jsonError("Invalid messageId", 400);

    const access = await getConversationAccess(req, conversationId, authUserId, true);
    if (access instanceof NextResponse) return access;

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        senderId: true,
        senderActorType: true,
        senderCommunityId: true,
        receiverActorType: true,
        receiverCommunityId: true,
        receiverId: true,
        conversationId: true,
        createdAt: true,
      },
    });

    if (!msg || msg.conversationId !== conversationId) {
      return jsonError("Message not found", 404);
    }

    const senderActor: MessageActor = {
      type: msg.senderActorType ?? "USER",
      userId: msg.senderActorType === "COMMUNITY" ? null : msg.senderId,
      communityId: msg.senderCommunityId ?? null,
    };

    if (!sameActor(access.currentActor, senderActor)) {
      return jsonError("Only sender can delete this message", 403);
    }

    await prisma.message.delete({ where: { id: messageId } });

    const latest = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        text: true,
        kind: true,
        senderId: true,
        senderActorType: true,
        senderCommunityId: true,
      },
    });

    const receiverActor: MessageActor = {
      type: msg.receiverActorType ?? "USER",
      userId: msg.receiverActorType === "COMMUNITY" ? null : msg.receiverId,
      communityId: msg.receiverCommunityId ?? null,
    };
    const receiverIsA = sameActor(receiverActor, actorFromSide(access.conversation, "A"));
    const receiverLastReadAt = receiverIsA
      ? access.conversation.userALastReadAt
      : access.conversation.userBLastReadAt;
    const wasUnread = receiverLastReadAt ? msg.createdAt > receiverLastReadAt : true;

    const data: Prisma.ConversationUpdateInput = {
      lastMessageAt: latest?.createdAt ?? null,
      lastMessageText: latest?.kind === "SHARED_POST" ? "Shared a post" : (latest?.text ?? null),
      lastMessageSenderId: latest?.senderId ?? null,
      lastMessageSenderActorType: latest?.senderActorType ?? "USER",
      lastMessageSenderCommunityId: latest?.senderCommunityId ?? null,
    };

    if (wasUnread) {
      if (receiverIsA) {
        data.userAUnreadCount = Math.max((access.conversation.userAUnreadCount ?? 0) - 1, 0);
      } else {
        data.userBUnreadCount = Math.max((access.conversation.userBUnreadCount ?? 0) - 1, 0);
      }
    }

    await prisma.conversation.update({ where: { id: conversationId }, data });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function clearConversation(req: NextRequest, conversationId: string) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    if (!conversationId) return jsonError("conversationId required", 400);
    if (!isValidObjectId(conversationId)) return jsonError("Invalid conversationId", 400);

    const access = await getConversationAccess(req, conversationId, authUserId);
    if (access instanceof NextResponse) return access;

    const actorA = actorFromSide(access.conversation, "A");
    const actorB = actorFromSide(access.conversation, "B");
    if (actorA.type === "COMMUNITY" || actorB.type === "COMMUNITY") {
      return jsonError(
        "Clearing community conversations for everyone is not supported",
        403,
      );
    }

    await prisma.message.deleteMany({ where: { conversationId } });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: null,
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageSenderActorType: "USER",
        lastMessageSenderCommunityId: null,
        userAUnreadCount: 0,
        userBUnreadCount: 0,
        userALastReadAt: null,
        userBLastReadAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = errorStatus(msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
