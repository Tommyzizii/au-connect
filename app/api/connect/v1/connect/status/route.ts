// app/api/connect/v1/connect/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const otherUserId = req.nextUrl.searchParams.get("otherUserId");

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId required" },
        { status: 400 }
      );
    }

    // Check if connection exists
    const pair = normalizePair(authUserId, otherUserId);
    const connection = await prisma.connection.findUnique({
      where: { userAId_userBId: pair },
    });

    return NextResponse.json({
      isConnected: !!connection,
      userId: otherUserId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}