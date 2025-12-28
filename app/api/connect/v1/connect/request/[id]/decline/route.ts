import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    
    const params = await context.params;
    const requestId = params?.id;

    if (!requestId) {
      return NextResponse.json({ error: "Missing request id" }, { status: 400 });
    }

    const request = await prisma.connectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.toUserId !== authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.connectionRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}