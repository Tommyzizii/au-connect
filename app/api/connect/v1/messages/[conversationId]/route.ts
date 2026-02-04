import { NextRequest } from "next/server";
import { getMessages, sendMessage } from "@/lib/messagingFunctions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;
  return getMessages(req, conversationId);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await context.params;
  return sendMessage(req, conversationId);
}
