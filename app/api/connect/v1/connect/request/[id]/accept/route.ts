import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const requestId = params.id;

    const row = await prisma.connectionRequest.findUnique({ where: { id: requestId } });
    if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (row.status !== "PENDING") return NextResponse.json({ error: "Request not pending" }, { status: 409 });
    if (row.toUserId !== authUserId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    const pair = normalizePair(row.fromUserId, row.toUserId);

    await prisma.$transaction([
      prisma.connection.create({ data: pair }),
      prisma.connectionRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } }),
      prisma.user.update({ where: { id: row.fromUserId }, data: { connections: { increment: 1 } } }),
      prisma.user.update({ where: { id: row.toUserId }, data: { connections: { increment: 1 } } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
