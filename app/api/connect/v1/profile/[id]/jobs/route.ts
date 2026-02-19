import { NextRequest } from "next/server";
import { getProfileJobPosts } from "@/lib/profileJobPostFunctions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const normalizedUserId = decodeURIComponent(id).trim();
  return await getProfileJobPosts(req, normalizedUserId);
}
