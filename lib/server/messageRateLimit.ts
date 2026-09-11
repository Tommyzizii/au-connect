import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

const MESSAGE_SEND_LIMIT = 20;
const MESSAGE_SEND_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_BUCKET_TTL_MS = 10 * 60 * 1000;

type RateLimitActor = {
  type: "USER" | "COMMUNITY";
  userId: string | null;
  communityId: string | null;
};

function getActorId(actor: RateLimitActor) {
  return actor.type === "COMMUNITY" ? actor.communityId : actor.userId;
}

function getWindowStart(now: Date) {
  return new Date(
    Math.floor(now.getTime() / MESSAGE_SEND_WINDOW_MS) * MESSAGE_SEND_WINDOW_MS,
  );
}

export async function enforceMessageSendRateLimit(actor: RateLimitActor) {
  const actorId = getActorId(actor);
  if (!actorId) {
    return NextResponse.json({ error: "Invalid message actor" }, { status: 400 });
  }

  const now = new Date();
  const windowStart = getWindowStart(now);
  const resetAt = new Date(windowStart.getTime() + MESSAGE_SEND_WINDOW_MS);
  const actorKey = `${actor.type}:${actorId}`;

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      actorKey_action_windowStart: {
        actorKey,
        action: "message-send",
        windowStart,
      },
    },
    create: {
      actorKey,
      action: "message-send",
      windowStart,
      count: 1,
      expiresAt: new Date(now.getTime() + RATE_LIMIT_BUCKET_TTL_MS),
    },
    update: {
      count: { increment: 1 },
      expiresAt: new Date(now.getTime() + RATE_LIMIT_BUCKET_TTL_MS),
    },
    select: {
      count: true,
    },
  });

  if (bucket.count <= MESSAGE_SEND_LIMIT) return null;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
  );

  return NextResponse.json(
    {
      error: "You are sending messages too quickly. Please wait before sending more.",
      retryAfterSeconds,
      limit: MESSAGE_SEND_LIMIT,
      windowSeconds: MESSAGE_SEND_WINDOW_MS / 1000,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
