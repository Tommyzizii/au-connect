import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtToken } from "@/lib/authFunctions";
import { JWT_COOKIE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(JWT_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJwtToken(token);

    const body = await req.json();
    const {
      username,
      title,
      about,
      location,
      phoneNo,
      phonePublic,
      emailPublic,
    } = body;

    // 🔒 VALIDATION: username must not be blank
    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username cannot be empty" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // 🔒 Stronger username regex:
    // letters, numbers, underscores, hyphens, spaces allowed inside (not at start)
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9 _.-]{2,29}$/;

    // Validate username format
    if (username && !usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username can only use letters, numbers, spaces, dots (.), underscores (_), and dashes (-), and must be 3–30 characters long.",
        },
        { status: 400 }
      );
    }


    // UPDATE USER — no experience/education here!
    const updated = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        username: cleanUsername,
        title,
        about,
        location,
        phoneNo,
        phonePublic,
        emailPublic,
      },
      select: {
        id: true,
        username: true,
        title: true,
        about: true,
        location: true,
        phoneNo: true,
        phonePublic: true,
        emailPublic: true,
        profilePic: true,
        coverPhoto: true,
        connections: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
