import { NextResponse } from "next/server";

import { GOOGLE_AUTH_URL } from "@/lib/constants";
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from "@/lib/env";

// this route redirects user to google oauth consent screen

export async function GET() {
  const redirect_uri = GOOGLE_REDIRECT_URI

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  return NextResponse.redirect(
    GOOGLE_AUTH_URL + "?" + params.toString()
  );
}
