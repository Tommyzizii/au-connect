import { NextRequest } from "next/server";

import { clearConversation } from "@/lib/messagingFunctions";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await ctx.params;
  return clearConversation(req, conversationId);
}
