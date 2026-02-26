import prisma from "@/lib/prisma";
import { safeUserSelect } from "@/lib/safeUserCall";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { applyContactVisibility } from "@/lib/contactVisibility";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let viewerUserId: string;

    try {
      viewerUserId = getAuthUserIdFromReq(request);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sanitizedUser = applyContactVisibility(user, viewerUserId);

    return NextResponse.json(sanitizedUser, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong", details: err },
      { status: 500 }
    );
  }
}
