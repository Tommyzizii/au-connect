import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseSlug } from "../utils/parseSlug";
import { buildSlug } from "../utils/buildSlug";
import { getCurrentUser } from "@/lib/getCurrentUser";
import ProfileView from "../components/ProfileView";
import { safeUserSelect } from "@/lib/safeUserCall";
import type User from "@/types/User";

// Validate Mongo ObjectId
function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Validate slug format (username-anything-id)
function isValidSlugFormat(slug: string) {
  return /^[a-z0-9-]+-[a-fA-F0-9]{24}$/.test(slug);
}

export default async function ProfilePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  if (!slug || !isValidSlugFormat(slug)) redirect("/404");

  // Parse ID from slug
  const { id } = parseSlug(slug);
  if (!id || !isValidObjectId(id)) redirect("/404");

  // Fetch profile user (viewed user)
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) redirect("/404");

  // Correct slug enforcement
  const correctSlug = buildSlug(user.username, user.id);
  if (slug !== correctSlug) redirect(`/profile/${correctSlug}`);

  // Session
  const session = await getCurrentUser();
  const sessionUserId = session?.userId ?? null;

  // Minimal session user (viewer) - IMPORTANT: no "slug" select because Prisma model doesn't have it
  const sessionUser: Pick<User, "id" | "username" | "slug" | "profilePic"> | null =
    sessionUserId
      ? await prisma.user
          .findUnique({
            where: { id: sessionUserId },
            select: {
              id: true,
              username: true,
              profilePic: true,
            },
          })
          .then((u) =>
            u
              ? {
                  id: u.id,
                  username: u.username,
                  slug: buildSlug(u.username, u.id), // ✅ computed, not selected
                  profilePic:
                    u.profilePic && u.profilePic.trim() !== ""
                      ? u.profilePic
                      : "/default_profile.jpg",
                }
              : null
          )
      : null;

  const isOwner = sessionUserId === user.id;
  const canSeePhone = isOwner || user.phonePublic === true;
  const canSeeEmail = isOwner || user.emailPublic === true;

  // Build final typed profile user object
  const userData: User = {
    id: user.id,
    username: user.username,
    slug: correctSlug,

    title: user.title || "",
    about: user.about || "",
    location: user.location || "",

    coverPhoto:
      user.coverPhoto && user.coverPhoto.trim() !== ""
        ? user.coverPhoto
        : "/default_cover.jpg",

    profilePic:
      user.profilePic && user.profilePic.trim() !== ""
        ? user.profilePic
        : "/default_profile.jpg",

    email: canSeeEmail ? (user.email ?? "") : "",
    phoneNo: canSeePhone ? (user.phoneNo ?? "") : "",

    phonePublic: user.phonePublic ?? false,
    emailPublic: user.emailPublic ?? true,

    connections: user.connections ?? 0,

    experience: user.experience.map((exp) => ({
      ...exp,
      endMonth: exp.endMonth ?? undefined,
      endYear: exp.endYear ?? undefined,
    })),

    education: user.education,
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <ProfileView
        user={userData}
        isOwner={isOwner}
        sessionUserId={sessionUserId}
        sessionUser={sessionUser} 
      />
    </div>
  );
}
