import { redirect } from "next/navigation";
import PostModalClient from "@/app/components/PostModalClient";
import { getPostWithMedia } from "@/lib/postHelpers";

export default async function PostModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { postId } = await params;
  const { media } = await searchParams;

  const post = await getPostWithMedia(postId);

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
