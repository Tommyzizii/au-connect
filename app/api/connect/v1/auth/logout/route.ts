import { NextResponse } from "next/server";
import { JWT_COOKIE } from "@/lib/constants";
import { isSecureCookie } from "@/lib/authFunctions";

export async function DELETE() {
  try {
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 },
    );

    // Keep cookie attributes aligned with login cookie settings.
    response.cookies.set(JWT_COOKIE, "", {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { message: "Logout failed", error: String(error) },
      { status: 500 }
    );
  }
}
