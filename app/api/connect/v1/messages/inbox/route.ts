import { NextRequest } from "next/server";
import { getMyInbox } from "@/lib/messagingFunctions";

export async function GET(req: NextRequest) {
  return getMyInbox(req);
}
