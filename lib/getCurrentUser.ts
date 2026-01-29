import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { JWT_COOKIE } from "./constants";
import { JWT_SECRET } from "./env";

export type AuthPayload = {
  userId: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_COOKIE)?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

export default getCurrentUser;
