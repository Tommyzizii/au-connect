// app/api/connect/v1/connections/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidConnectionUserId, normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> } 
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    
    // AWAIT params before accessing userId
    const params = await context.params;
    const otherUserId = params?.userId;

    if (!isValidConnectionUserId(otherUserId)) {
      return NextResponse.json(
        { error: "A valid userId is required" },
        { status: 400 },
      );
    }

    if (otherUserId === authUserId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    const pair = normalizePair(authUserId, otherUserId);

    await prisma.$transaction([
      prisma.connection.delete({ where: { userAId_userBId: pair } }),
      prisma.user.update({
        where: { id: authUserId },
        data: { connections: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: otherUserId },
        data: { connections: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to remove connection");
  }
}
