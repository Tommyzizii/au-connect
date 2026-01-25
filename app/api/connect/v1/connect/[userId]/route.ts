import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
    try {
        const authUserId = getAuthUserIdFromReq(req);
        const otherUserId = params.userId;

        if (!otherUserId) return NextResponse.json({ error: "userId required" }, { status: 400 });
        if (otherUserId === authUserId) return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });

        const pair = normalizePair(authUserId, otherUserId);

        await prisma.$transaction([
            prisma.connection.delete({ where: { userAId_userBId: pair } }),
            prisma.user.update({ where: { id: authUserId }, data: { connections: { decrement: 1 } } }),
            prisma.user.update({ where: { id: otherUserId }, data: { connections: { decrement: 1 } } }),
        ]);

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const message =
            e instanceof Error ? e.message : "Server error";

        return NextResponse.json(
            { error: message },
            { status: 401 }
        );
    }

}
