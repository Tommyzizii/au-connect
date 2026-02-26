export type ContactVisibilityUser = {
  id: string;
  email: string | null;
  phoneNo: string | null;
  emailPublic: boolean | null;
  phonePublic: boolean | null;
};

/**
 * Enforce contact visibility on user-shaped objects.
 * - Owners always see their own contact info.
 * - Other viewers only see fields marked as public.
 */
export function applyContactVisibility<T extends ContactVisibilityUser>(
  user: T,
  viewerUserId: string | null | undefined,
): Omit<T, "email" | "phoneNo"> & { email: string; phoneNo: string } {
  const isOwner = viewerUserId === user.id;
  const canSeeEmail = isOwner || user.emailPublic === true;
  const canSeePhone = isOwner || user.phonePublic === true;

  return {
    ...user,
    email: canSeeEmail ? (user.email ?? "") : "",
    phoneNo: canSeePhone ? (user.phoneNo ?? "") : "",
  };
}
