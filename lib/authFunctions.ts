import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import prisma from "../lib/prisma";
import SessionMethod from "../enums/SessionMethod";
import { JWT_COOKIE, COOKIE_EXPIRATION_TIME, GOOGLE_ACCESS_TOKEN_URL, GOOGLE_USERINFO_URL, LINKEDIN_ACCESS_TOKEN_URL, LINKEDIN_USERINFO_URL } from "./constants";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, JWT_SECRET, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI, NEXT_PUBLIC_BASE_URL, NODE_ENV } from "./env";

export async function tradSignup(req: NextRequest) {
  // get inputs from request body
  const { email, password } = await req.json();

  // validate input
  if (!email) 
    return new NextResponse("Email is required", { status: 400 });
  if (!password)
    return new NextResponse("Password is required", { status: 400 });

  // check if user already exists
  const existingUser = await checkExistUser(email);
  if (existingUser) {
    return new NextResponse("User already exists, please login instead", {
      status: 409,
    });
  }

  // hash password
  const hashedPsw = await bcrypt.hash(password, 10);

  // create new user
  try {
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPsw,
      },
    });

    return createUserSession(
      { id: user.id, email: user.email },
      SessionMethod.SIGN_UP
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Error signing up user in file:${__filename}`, error },
      { status: 500 }
    );
  }
}

export async function googleAuthSignIn(req: NextRequest) {
  // the url from google
  const url = new URL(req.url);
  // gets the code containing the authorization data
  const code = url.searchParams.get("code");

  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  // Exchange code for access token
  const tokenRes = await fetch(GOOGLE_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  // Fetch user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await userRes.json();

  // check if user exists
  let user = await checkExistUser(profile.email);

  // if user does not exist create new user record
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.sub,
      },
    });
  } else {
    // update existing user with Google ID
    user = await prisma.user.update({
      where: { email: profile.email },
      data: { googleId: profile.sub },
    });
  }

  return createUserSession(
    { id: user.id, email: user.email },
    SessionMethod.SIGN_IN_GOOGLE
  );
}

export async function linkedinAuthSignIn(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  // const state = url.searchParams.get("state");

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  // Exchange code for access token
  const tokenRes = await fetch(LINKEDIN_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    })
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken)
    return NextResponse.json({ error: "Token exchange failed" }, { status: 400 });

  // fetch user info via OIDC
  const infoRes = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const userInfo = await infoRes.json();

  // console.log('LinkedIn User Info:', userInfo);

  // check if user exists
  let user = await checkExistUser(userInfo.email);

  // if user does not exist create new user record
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userInfo.email,
        linkedinId: userInfo.sub,
      },
    });
  } else {
    // update existing user with LinkedIn ID
    user = await prisma.user.update({
      where: { email: userInfo.email },
      data: { linkedinId: userInfo.sub },
    });
  }

  // Create a login session
  createUserSession(
    { id: user.id, email: user.email },
    SessionMethod.SIGN_IN_LINKEDIN
  );

  return NextResponse.redirect(NEXT_PUBLIC_BASE_URL + `/?success=true&provider=linkedin`);
}

export async function tradLogin(req: NextRequest) {
    const { email, password } = await req.json();

    if (!email) return new NextResponse("Email is required", { status: 400 });
    if (!password) return new NextResponse("Password is required", { status: 400 });

    const user = await checkExistUser(email);
    if (!user) {
        return new NextResponse("You might not have an account, please sign up first", { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password!);
    if (!passwordMatch) {
        return new NextResponse("Incorrect password", { status: 401 });
    }

    return createUserSession(
        { id: user.id, email: user.email },
        SessionMethod.LOGIN
    );
}

export async function logout(req: NextRequest) {
    req.cookies.delete(JWT_COOKIE);
    return getResponse({id: "", email: ""}, SessionMethod.LOGOUT);
}

// checks email only
export async function checkExistUser(email: string) {
  return await prisma.user.findUnique({
    where: { email: email },
  });
}

export function createUserSession(
  user: { id: string; email: string },
  method: SessionMethod
  //   req?: NextRequest | null = null
) {
  // create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: COOKIE_EXPIRATION_TIME }
  );

  const response = getResponse(user, method);

  // set the JWT in the cookie
  if (response) {
    response.cookies.set({
      name: JWT_COOKIE,
      value: token,
      httpOnly: true,
      secure: NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}

function getResponse(
  user: { id: string; email: string },
  method: SessionMethod,
) {
  switch (method) {
    case SessionMethod.LOGIN:
      return NextResponse.json(
        { message: "Logged in successfully", user },
        { status: 200 }
      );
    case SessionMethod.LOGOUT:
      return NextResponse.json(
        { message: "Logged out successfully" },
        { status: 200 }
      );
    case SessionMethod.SIGN_IN_GOOGLE:
      // this case represents OAuth sign in with google
      // TODO: this is temporary redirect to home page, can be changed later
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=google`);
    case SessionMethod.SIGN_IN_LINKEDIN:
      // this case represents OAuth sign in with linkedin
      // TODO: this is temporary redirect to home page, can be changed later
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?success=true&provider=linkedin`);
    case SessionMethod.SIGN_UP:
      return NextResponse.json(
        { message: "Signed up successfully", user },
        { status: 201 }
      );
    default:
    // TODO: add default response ?
  }
}
