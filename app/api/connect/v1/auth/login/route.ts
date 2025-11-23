import { NextRequest } from "next/server"

import { tradLogin } from "@/lib/authFunctions"

export async function POST(req: NextRequest) {
    return await tradLogin(req);
}