// app/api/connect/v1/connect/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isValidConnectionUserId, normalizePair } from "@/lib/connect";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { routeErrorResponse } from "@/lib/server/routeErrors";

export async function GET(req: NextRequest) {
  try {
    const authUserId = getAuthUserIdFromReq(req);
    const otherUserId = req.nextUrl.searchParams.get("otherUserId");

    if (!isValidConnectionUserId(otherUserId)) {
      return NextResponse.json(
        { error: "A valid otherUserId is required" },
        { status: 400 },
      );
    }

    const pair = normalizePair(authUserId, otherUserId);
    const [connection, outgoingRequest, incomingRequest] = await Promise.all([
      prisma.connection.findUnique({
        where: { userAId_userBId: pair },
        select: { id: true },
      }),
      prisma.connectionRequest.findFirst({
        where: {
          fromUserId: authUserId,
          toUserId: otherUserId,
          status: "PENDING",
        },
        select: { id: true },
      }),
      prisma.connectionRequest.findFirst({
        where: {
          fromUserId: otherUserId,
          toUserId: authUserId,
          status: "PENDING",
        },
        select: { id: true },
      }),
    ]);

    const status = connection
      ? "CONNECTED"
      : outgoingRequest
        ? "OUTGOING_PENDING"
        : incomingRequest
          ? "INCOMING_PENDING"
          : "NONE";

    const requestId = outgoingRequest?.id ?? incomingRequest?.id ?? null;

    return NextResponse.json(
      {
        status,
        requestId,
        // Keep this field for callers that still use the old response shape.
        isConnected: status === "CONNECTED",
        userId: otherUserId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return routeErrorResponse(error, "Failed to fetch connection status");
  }
}
