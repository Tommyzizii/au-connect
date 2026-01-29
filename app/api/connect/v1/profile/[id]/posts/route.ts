import { NextRequest } from "next/server";
import { getProfilePosts } from "@/lib/profilePostFunctions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // params is a Promise in Next 16
) {
  const { id } = await context.params; //  MUST await

  const normalizedUserId = decodeURIComponent(id).trim();

  return await getProfilePosts(req, normalizedUserId);
}
