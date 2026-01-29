// app/api/connect/v1/connect/request/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

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
    if (!requestId) {
      return NextResponse.json({ error: "Missing request id" }, { status: 400 });
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}