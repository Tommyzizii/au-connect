import { NextResponse } from "next/server";

/**
 * Error class representing an authentication error. This error is thrown when a user is not authenticated.
 * It extends the built-in Error class and sets the error message to "Unauthorized".
 * @author Minn
 */
export class AuthenticationError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthenticationError";
  }
}

/**
 * Generates a standardized error response for API routes.
 * @param error
 * @param context 
 * @returns 
 * @author Minn
 */
export function routeErrorResponse(error: unknown, context: string) {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error(context, error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
