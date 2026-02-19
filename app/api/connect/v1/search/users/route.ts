import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";

export async function GET(req: NextRequest) {
  try {
    // optional auth guard (kept)
    getAuthUserIdFromReq(req);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        profilePic: true,
        title: true,
      },
      take: 8,
    });

    // (username + userId)
    const results = users.map((u) => ({
      ...u,
      slug: buildSlug(u.username, u.id),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("User search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}