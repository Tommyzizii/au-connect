import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const [email, userId] = getHeaderUserInfo(req);

    if (!email || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await context.params;

    const jobPost = await prisma.jobPost.findUnique({
      where: { postId },
      include: { post: true },
    });

    if (!jobPost || jobPost.post.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const updated = await prisma.jobPost.update({
      where: { id: jobPost.id },
      data: {
        status: "CLOSED",
      },
    });

    return NextResponse.json(updated);

  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Failed to close job" },
      { status: 500 },
    );
  }
}