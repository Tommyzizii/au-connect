import { NextRequest } from "next/server";
import { JWT_COOKIE } from "@/lib/constants";     
import { verifyJwtToken } from "@/lib/authFunctions";      

export function getAuthUserIdFromReq(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;
  if (!token) throw new Error("Unauthorized");

  const decoded = verifyJwtToken(token); // { userId, email }
  return decoded.userId;
}
