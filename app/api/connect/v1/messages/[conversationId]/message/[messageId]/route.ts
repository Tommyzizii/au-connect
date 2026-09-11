import { NextRequest } from "next/server";

import { deleteMessageForEveryone } from "@/lib/messagingFunctions";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string; messageId: string }> },
) {
  const { conversationId, messageId } = await ctx.params;
  return deleteMessageForEveryone(req, conversationId, messageId);
}
