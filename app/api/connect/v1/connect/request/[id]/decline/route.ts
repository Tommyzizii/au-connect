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
    
    const params = await context.params;
    const requestId = params?.id;

    if (!isValidConnectionUserId(requestId)) {
      return NextResponse.json(
        { error: "A valid request id is required" },
        { status: 400 },
      );
    }

    const request = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.toUserId !== authUserId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to decline connection request");
  }
}
