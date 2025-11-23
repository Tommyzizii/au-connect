
import { NextRequest } from "next/server";

import { linkedinAuthSignIn } from "@/lib/authFunctions";

export async function GET(req: NextRequest) {
    return linkedinAuthSignIn(req)
}
