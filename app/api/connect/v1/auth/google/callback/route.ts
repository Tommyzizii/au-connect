import { NextRequest } from "next/server";

import { googleAuthSignIn } from "@/lib/authFunctions";

export async function GET(req: NextRequest) {
   return googleAuthSignIn(req);
}
