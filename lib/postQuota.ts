import { POST_LIMITS } from "./postLimits";
import type { Prisma } from "@/lib/generated/prisma";

export class PostLimitError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export function consumePostQuota(timestamps: Date[], now = new Date()) {
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const minuteAgo = now.getTime() - 60 * 1000;
  const recent = timestamps
    .filter((timestamp) => timestamp.getTime() > dayAgo)
    .sort((left, right) => left.getTime() - right.getTime());
  const recentMinute = recent.filter(
    (timestamp) => timestamp.getTime() > minuteAgo,
  );

  const retryTimes: number[] = [];
  if (recentMinute.length >= POST_LIMITS.postsPerMinute) {
    retryTimes.push(
      recentMinute[recentMinute.length - POST_LIMITS.postsPerMinute].getTime() +
        60_000 -
        now.getTime(),
    );
  }
  if (recent.length >= POST_LIMITS.postsPerDay) {
    retryTimes.push(
      recent[recent.length - POST_LIMITS.postsPerDay].getTime() +
        86_400_000 -
        now.getTime(),
    );
  }
  if (retryTimes.length) {
    throw new PostLimitError(
      "Posting limit reached: 5 posts per minute and 50 posts per 24 hours.",
      429,
      Math.max(1, Math.ceil(Math.max(...retryTimes) / 1000)),
    );
  }
  return [...recent, now];
}

export async function reservePostQuota(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { successfulPostTimes: true },
  });
  const now = new Date();
  const timestamps =
    user.successfulPostTimes.length > 0
      ? user.successfulPostTimes
      : (
          await tx.post.findMany({
            where: { userId, createdAt: { gt: new Date(now.getTime() - 86_400_000) } },
            select: { createdAt: true },
          })
        ).map((post) => post.createdAt);
  await tx.user.update({
    where: { id: userId },
    data: { successfulPostTimes: consumePostQuota(timestamps, now) },
  });
}

export async function retryPostTransaction<T>(work: () => Promise<T>) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (
        !(error && typeof error === "object" && "code" in error) ||
        error.code !== "P2034" ||
        attempt === 3
      ) {
        throw error;
      }
    }
  }
  throw new Error("Unreachable");
}
