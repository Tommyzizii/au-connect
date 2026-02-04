import { NextRequest } from "next/server";
import { getOrCreateConversation } from "@/lib/messagingFunctions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ otherUserId: string }> }
) {
  const { otherUserId } = await context.params;
  return getOrCreateConversation(req, otherUserId);
}
