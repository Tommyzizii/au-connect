import { redirect } from "next/navigation";
import PostPageClient from "@/app/components/PostPageClient";
import { getPostWithMedia } from "@/lib/postHelpers";
import getCurrentUser from "@/lib/getCurrentUser";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string; ref?: string }>;
}) {
  const { postId } = await params;
  const { media, ref } = await searchParams;

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
    <PostPageClient
      post={post}
      postId={postId}
      initialIndex={media ? parseInt(media, 10) : 0}
      hasRefShare={ref === "share"}
    />
  );
}
