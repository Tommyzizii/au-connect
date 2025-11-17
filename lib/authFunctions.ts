import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import SessionMethod from "../enums/SessionMethod";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export async function tradSignup(req: NextRequest) {
  // get inputs from request body
  const { email, password } = await req.json();

  // validate input
  if (!email) return new NextResponse("Email is required", { status: 400 });
  if (!password)
    return new NextResponse("Password is required", { status: 400 });

  // check if user already exists
  const existingUser = await checkExistingUser(email);
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

// checks email only
export async function checkExistingUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    return user;
  } catch (error) {
    return NextResponse.json(
      { message: "Error checking user", error },
      { status: 500 }
    );
  }
}

export function createUserSession(
  user: { id: string; email: string },
  method: SessionMethod
  //   req?: NextRequest | null = null
) {
  // create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  const response = getResponse(user, method);

  // set the JWT in the cookie
  if (response) {
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}

function getResponse(
  user: { id: string; email: string },
  method: SessionMethod
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
    case SessionMethod.SIGN_IN:
      // this case represents OAuth sign in with google
      // TODO: this is temporary redirect to home page, can be changed later
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/`);
    case SessionMethod.SIGN_UP:
      return NextResponse.json(
        { message: "Signed up successfully", user },
        { status: 201 }
      );
    default:
    // TODO: add default response ?
  }
}
