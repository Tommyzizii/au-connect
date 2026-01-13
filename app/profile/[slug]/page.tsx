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

  // Fetch from DB using safe select
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) redirect("/404");

  // Correct slug enforcement
  const correctSlug = buildSlug(user.username, user.id);
  if (slug !== correctSlug) redirect(`/profile/${correctSlug}`);

  // Get logged-in user
  const session = await getCurrentUser();
  const isOwner = session?.userId === user.id;

  // Build final typed user object
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

    // createdAt: user.createdAt?.toISOString?.() ?? undefined,

    phoneNo: user.phoneNo || "",
    phonePublic: user.phonePublic ?? false,
    emailPublic: user.emailPublic ?? true,

    connections: user.connections ?? 0,

    experience: user.experience.map((exp) => ({
      ...exp,
      endMonth: exp.endMonth ?? undefined,
      endYear: exp.endYear ?? undefined,
    })),

    education: user.education,
    posts: user.posts,
  };

  return (
    //TODO:recommendedPeople type needs to be fixed
    <ProfileView user={userData} recommendedPeople={new Array<number>()} isOwner={isOwner} />
  );
}
