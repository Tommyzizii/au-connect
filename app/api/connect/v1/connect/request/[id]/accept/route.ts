import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidConnectionUserId, normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { createNotification } from "@/lib/server/notifications.server";
import { requireAccountVerification } from "@/lib/accountVerification";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const { id: requestId } = await params;

    if (!isValidConnectionUserId(requestId)) {
      return NextResponse.json(
        { error: "A valid request id is required" },
        { status: 400 },
      );
    }

    const verificationError = await requireAccountVerification(authUserId);
    if (verificationError) return verificationError;

    const row = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (row.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request not pending" },
        { status: 409 },
      );
    }
    if (row.toUserId !== authUserId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const pair = normalizePair(row.fromUserId, row.toUserId);

    await prisma.$transaction([
      prisma.connection.create({ data: pair }),
      prisma.connectionRequest.update({
        where: { id: requestId },
        data: { status: "ACCEPTED" },
      }),
      prisma.user.update({
        where: { id: row.fromUserId },
        data: { connections: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: row.toUserId },
        data: { connections: { increment: 1 } },
      }),
    ]);

    await createNotification({
      userId: row.fromUserId,
      fromUserId: authUserId,
      type: "CONNECTION_ACCEPTED",
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to accept connection request");
  }
}
