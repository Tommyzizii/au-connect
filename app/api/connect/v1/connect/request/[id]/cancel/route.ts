// app/api/connect/v1/connect/request/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { isValidConnectionUserId } from "@/lib/connect";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }  
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    
    // AWAIT params before accessing id
    const params = await context.params;
    const requestId = params?.id;

    // Validate requestId exists
    if (!isValidConnectionUserId(requestId)) {
      return NextResponse.json(
        { error: "A valid request id is required" },
        { status: 400 },
      );
    }

    const row = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (row.status !== "PENDING") {
      return NextResponse.json({ error: "Request not pending" }, { status: 409 });
    }

    if (row.fromUserId !== authUserId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: "CANCELED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to cancel connection request");
  }
}
