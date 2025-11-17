import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // the url from google
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  // Exchange code for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await userRes.json();

  // Save to DB if not exist
  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  // create record if user does not exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.sub,
      },
    });
  }

   const baseUrl = req.nextUrl.origin;
   return NextResponse.redirect(baseUrl)
}
