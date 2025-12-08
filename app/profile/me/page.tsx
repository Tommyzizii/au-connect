"use server";

import { redirect } from "next/navigation";
import getCurrentUser from "@/lib/getCurrentUser";
import prisma from "@/lib/prisma";
import { buildSlug } from "../utils/buildSlug";
import { safeUserSelect } from "@/lib/safeUserCall";
import { SIGNIN_PAGE_PATH } from "@/lib/constants";

export default async function MyProfilePage() {
  const session = await getCurrentUser();  // MUST await
  if (!session) redirect(SIGNIN_PAGE_PATH);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
     select: safeUserSelect,
    });

  if (!user) redirect(SIGNIN_PAGE_PATH);

  const slug = buildSlug(user.username, user.id);

  redirect(`/profile/${slug}`);
}
