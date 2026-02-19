// app/api/connect/v1/connect/my-connections/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const me = getAuthUserIdFromReq(req);

    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ userAId: me }, { userBId: me }],
      },
      select: {
        userAId: true,
        userBId: true,
      },
    });

    const friendIds = connections.map((c) => (c.userAId === me ? c.userBId : c.userAId));

    if (!friendIds.length) {
      return NextResponse.json({ data: [] });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        username: true,
        title: true,
        profilePic: true,
      },
      orderBy: { username: "asc" },
    });

    return NextResponse.json({ data: users });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
