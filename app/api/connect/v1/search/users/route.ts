import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";

type SearchResult =
  | {
      type: "USER";
      id: string;
      username: string;
      slug: string;
      title: string | null;
      profilePic: string | null;
    }
  | {
      type: "COMMUNITY";
      id: string;
      name: string;
      slug: string;
      about: string | null;
      profilePic: string | null;
    };

export async function GET(req: NextRequest) {
  try {
    // optional auth guard (kept)
    getAuthUserIdFromReq(req);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const [users, communities] = await Promise.all([
      prisma.user.findMany({
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
        take: 6,
      }),
      prisma.community.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { about: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          about: true,
          profilePic: true,
        },
        take: 6,
      }),
    ]);

    // (username + userId)
    const userResults: SearchResult[] = users.map((u) => ({
      ...u,
      type: "USER",
      slug: buildSlug(u.username, u.id),
    }));

    const communityResults: SearchResult[] = communities.map((community) => ({
      ...community,
      type: "COMMUNITY",
    }));

    const results = [...userResults, ...communityResults].slice(0, 10);

    return NextResponse.json(results);
  } catch (error) {
    console.error("User search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
