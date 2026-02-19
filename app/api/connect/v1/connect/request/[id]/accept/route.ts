import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { createNotification } from "@/lib/server/notifications.server";


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: requestId } = await params;

  const authUserId = getAuthUserIdFromReq(req);

  const row = await prisma.connectionRequest.findUnique({
    where: { id: requestId },
  });

  if (!row)
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (row.status !== "PENDING")
    return NextResponse.json({ error: "Request not pending" }, { status: 409 });
  if (row.toUserId !== authUserId)
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });

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
    userId: row.fromUserId,    // original sender
    fromUserId: authUserId,    // accepter
    type: "CONNECTION_ACCEPTED",
  });


  return NextResponse.json({ ok: true });
}
