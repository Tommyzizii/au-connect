// app/api/connect/v1/messages/unread-count/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);

    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        userAId: true,
        userBId: true,
        userAUnreadCount: true,
        userBUnreadCount: true,
      },
    });

    let total = 0;
    for (const c of conversations) {
      total += c.userAId === userId ? (c.userAUnreadCount ?? 0) : (c.userBUnreadCount ?? 0);
    }

    return NextResponse.json({ count: total });
  } catch (error) {
    console.error("Unread count error FULL:", error); // keep this
    return NextResponse.json({ error: String(error) }, { status: 500 }); // TEMP
  }
}

