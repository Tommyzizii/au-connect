import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidConnectionUserId, normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { createNotification } from "@/lib/server/notifications.server";
import { requireAccountVerification } from "@/lib/accountVerification";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function POST(req: NextRequest) {
  try {
    const fromUserId = getAuthUserIdFromReq(req);
    const body: unknown = await req.json().catch(() => null);
    const toUserId =
      body && typeof body === "object" && "toUserId" in body
        ? body.toUserId
        : null;

    if (!isValidConnectionUserId(toUserId)) {
      return NextResponse.json(
        { error: "A valid toUserId is required" },
        { status: 400 },
      );
    }

    if (toUserId === fromUserId) {
      return NextResponse.json(
        { error: "Cannot connect to yourself" },
        { status: 400 },
      );
    }

    const verificationError = await requireAccountVerification(fromUserId);
    if (verificationError) return verificationError;

    const pair = normalizePair(fromUserId, toUserId);
    const existingConn = await prisma.connection.findUnique({
      where: { userAId_userBId: pair },
    });
    if (existingConn) {
      return NextResponse.json(
        { error: "Already connected" },
        { status: 409 },
      );
    }

    const reversePending = await prisma.connectionRequest.findFirst({
      where: {
        fromUserId: toUserId,
        toUserId: fromUserId,
        status: "PENDING",
      },
    });

    if (reversePending) {
      await prisma.$transaction([
        prisma.connection.create({ data: pair }),
        prisma.connectionRequest.update({
          where: { id: reversePending.id },
          data: { status: "ACCEPTED" },
        }),
        prisma.user.update({
          where: { id: fromUserId },
          data: { connections: { increment: 1 } },
        }),
        prisma.user.update({
          where: { id: toUserId },
          data: { connections: { increment: 1 } },
        }),
      ]);

      return NextResponse.json({ ok: true, autoAccepted: true });
    }

    const alreadyPending = await prisma.connectionRequest.findFirst({
      where: { fromUserId, toUserId, status: "PENDING" },
    });
    if (alreadyPending) {
      return NextResponse.json({
        ok: true,
        alreadyPending: true,
        request: alreadyPending,
      });
    }

    const created = await prisma.connectionRequest.create({
      data: { fromUserId, toUserId, status: "PENDING" },
    });

    await createNotification({
      userId: toUserId,
      fromUserId,
      type: "CONNECTION_REQUEST",
      entityId: created.id,
    });

    return NextResponse.json({ ok: true, request: created });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to create connection request");
  }
}
