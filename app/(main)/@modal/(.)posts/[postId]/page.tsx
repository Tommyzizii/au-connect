import { redirect } from "next/navigation";
import PostModalClient from "@/app/components/PostModalClient";
import { getPostWithMedia } from "@/lib/postHelpers";
import getCurrentUser from "@/lib/getCurrentUser";

export default async function PostModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { postId } = await params;
  const { media } = await searchParams;

  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/");
  }

  const { userId } = auth;
  const post = await getPostWithMedia(postId, userId);

  if (!post) {
    redirect("/");
  }

  return (
    <PostModalClient
      post={post}
      initialIndex={media ? parseInt(media, 10) : 0}
    />
  );
}
