import { NextRequest } from "next/server";
import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import { AuthenticationError } from "@/lib/server/routeErrors";

/** 
 * Used by most of the connect API routes that enable the connection features 
 * and extracts the authenticated user ID from the request.
 * @param req - The NextRequest object.
 * @returns The authenticated user ID.
 * @throws AuthenticationError if the user is not authenticated.
 * @author Minn
 */
export function getAuthUserIdFromReq(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;
  if (!token) throw new AuthenticationError();

  try {
    const decoded = verifyJwtToken(token);
    return decoded.userId;
  } catch {
    throw new AuthenticationError();
  }
}
