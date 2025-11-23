import { NextResponse } from "next/server";
import crypto from "crypto";

import { LINKEDIN_AUTH_URL } from "@/lib/constants";
import { LINKEDIN_CLIENT_ID, LINKEDIN_REDIRECT_URI } from "@/lib/env";

export async function GET() {
  const redirect_uri = LINKEDIN_REDIRECT_URI;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: redirect_uri, 
    scope: "openid profile email",
    state: crypto.randomUUID(),
  });

  console.log("Using LinkedIn redirect_uri:", redirect_uri);

  return NextResponse.redirect(
    LINKEDIN_AUTH_URL + "?" + params.toString()
  );
}
