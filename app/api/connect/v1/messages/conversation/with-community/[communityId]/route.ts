import { NextRequest } from "next/server";

import { getOrCreateCommunityConversation } from "@/lib/messagingFunctions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ communityId: string }> },
) {
  const { communityId } = await context.params;
  return getOrCreateCommunityConversation(req, communityId);
}
