import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ACCOUNT_VERIFICATION_PAGE_PATH } from "@/lib/constants";

export { VerificationRequiredError, VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verificationError";
import { VERIFICATION_REQUIRED_MESSAGE } from "@/lib/verificationError";

export async function getAccountVerificationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountVerificationStatus: true,
      accountVerificationRole: true,
    },
  });

  return user;
}

export async function isAccountVerified(userId: string) {
  const user = await getAccountVerificationStatus(userId);
  return user?.accountVerificationStatus === "APPROVED";
}

export async function requireAccountVerification(userId: string) {
  const verified = await isAccountVerified(userId);

  if (verified) return null;

  return NextResponse.json(
    {
      error: VERIFICATION_REQUIRED_MESSAGE,
      requiresVerification: true,
      redirectTo: ACCOUNT_VERIFICATION_PAGE_PATH,
    },
    { status: 403 },
  );
}
