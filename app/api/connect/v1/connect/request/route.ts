import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { createNotification } from "@/lib/server/notifications.server";


export async function POST(req: NextRequest) {
    try {
        const fromUserId = getAuthUserIdFromReq(req);
        const { toUserId } = await req.json();

        if (!toUserId) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
        if (toUserId === fromUserId) return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });

        // already connected?
        const pair = normalizePair(fromUserId, toUserId);
        const existingConn = await prisma.connection.findUnique({
            where: { userAId_userBId: pair },
        });
        if (existingConn) return NextResponse.json({ error: "Already connected" }, { status: 409 });

        // if they already requested you -> auto accept
        const reversePending = await prisma.connectionRequest.findFirst({
            where: { fromUserId: toUserId, toUserId: fromUserId, status: "PENDING" },
        });

        if (reversePending) {
            await prisma.$transaction([
                prisma.connection.create({ data: pair }),
                prisma.connectionRequest.update({
                    where: { id: reversePending.id },
                    data: { status: "ACCEPTED" },
                }),
                prisma.user.update({ where: { id: fromUserId }, data: { connections: { increment: 1 } } }),
                prisma.user.update({ where: { id: toUserId }, data: { connections: { increment: 1 } } }),
            ]);

            return NextResponse.json({ ok: true, autoAccepted: true });
        }

        // prevent duplicate pending
        const alreadyPending = await prisma.connectionRequest.findFirst({
            where: { fromUserId, toUserId, status: "PENDING" },
        });
        if (alreadyPending) return NextResponse.json({ error: "Request already sent" }, { status: 409 });

        const created = await prisma.connectionRequest.create({
            data: { fromUserId, toUserId, status: "PENDING" },
        });

        await createNotification({
            userId: toUserId,          // receiver
            fromUserId: fromUserId,    // sender
            type: "CONNECTION_REQUEST",
            entityId: created.id,
        });

        return NextResponse.json({ ok: true, request: created });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Server error";

        return NextResponse.json({ error: message }, { status: 401 });
    }
}
