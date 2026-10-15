import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function GET(req: NextRequest) {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const type = req.nextUrl.searchParams.get("type");

        if (type !== "incoming" && type !== "outgoing") {
            return NextResponse.json({ error: "type must be incoming|outgoing" }, { status: 400 });
        }

        const where =
            type === "incoming"
                ? { toUserId: authUserId, status: "PENDING" as const }
                : { fromUserId: authUserId, status: "PENDING" as const };

        const data = await prisma.connectionRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                fromUser: { select: { id: true, username: true, email: true, profilePic: true, title: true } },
                toUser: { select: { id: true, username: true, email: true, profilePic: true, title: true } },
            },
        });

        return NextResponse.json({ ok: true, data });
    } catch (error: unknown) {
        return routeErrorResponse(error, "Failed to fetch connection requests");
    }
}
