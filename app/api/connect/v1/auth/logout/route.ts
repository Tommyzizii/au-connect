import { NextRequest } from "next/server";

import { logout } from "@/lib/authFunctions";

export async function POST(req: NextRequest) {
    return await logout(req);
}