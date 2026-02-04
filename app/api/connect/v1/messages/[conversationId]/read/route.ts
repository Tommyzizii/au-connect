import { NextRequest, NextResponse } from "next/server";
import { markConversationRead } from "@/lib/messagingFunctions";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await ctx.params; 
  return markConversationRead(req, conversationId);
}
