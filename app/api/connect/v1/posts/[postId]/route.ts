// import { NextResponse, NextRequest } from "next/server";
import { NextRequest } from "next/server";

import { getSinglePost } from "@/lib/singlePostFunctions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const params = await context.params;
  return await getSinglePost(req, params);
}
