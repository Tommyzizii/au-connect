import { NextRequest } from "next/server";
import { getUnreadMessagesCount } from "@/lib/messagingFunctions";

export async function GET(req: NextRequest) {
  return getUnreadMessagesCount(req);
}

