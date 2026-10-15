// app/api/connect/v1/connect/connections/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidConnectionUserId } from "@/lib/connect";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!isValidConnectionUserId(userId)) {
      return NextResponse.json(
        { error: "A valid userId is required" },
        { status: 400 },
      );
    }

    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    const friendIds = connections.map((connection) =>
      connection.userAId === userId
        ? connection.userBId
        : connection.userAId,
    );

    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        username: true,
        title: true,
        profilePic: true,
      },
    });

    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to fetch user connections");
  }
}
