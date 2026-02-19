import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";

export async function GET(
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
      where: {
        postId: postId,
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        status: true, 
        post: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!jobPost) {
      return NextResponse.json(
        { error: "Job post not found" },
        { status: 404 },
      );
    }

    if (jobPost.post.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      id: jobPost.id,
      title: jobPost.jobTitle,
      companyName: jobPost.companyName,
      status: jobPost.status,
      applicantCount: jobPost._count.applications,
    });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to fetch job post" },
      { status: 500 },
    );
  }
}