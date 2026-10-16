import "server-only";

import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

import { JWT_COOKIE } from "@/lib/constants";
import { JWT_SECRET } from "@/lib/env";
import { AuthenticationError } from "@/lib/server/routeErrors";

export type RouteAuthSession = Readonly<{
  userId: string;
  email: string;
}>;

/**
 * Verifies the request's signed session cookie and returns its identity claims.
 *
 * This function deliberately does not trust identity headers injected by Proxy,
 * which keeps route handlers protected when they are invoked without Proxy.
 * In this function the cookie is verified and the tokens's payload itself is checked
 * and the payload's claims are validated and returned.
 * Feature eligibility and resource authorization must be checked separately.
 *
 * @throws {AuthenticationError} When the cookie is missing, invalid, expired,
 * or does not contain the required identity claims.
 * @returns The identity claims from the verified session cookie or JWT token.
 * @author Minn
 */
export function requireRouteAuth(req: NextRequest): RouteAuthSession {
  const token = req.cookies.get(JWT_COOKIE)?.value;
  if (!token) throw new AuthenticationError();

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string" ||
      payload.userId.trim().length === 0 ||
      typeof payload.email !== "string" ||
      payload.email.trim().length === 0
    ) {
      throw new AuthenticationError();
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    throw new AuthenticationError();
  }
}
