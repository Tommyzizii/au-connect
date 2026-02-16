import { redirect } from "next/navigation";
import PostPageClient from "@/app/components/PostPageClient";
import { getPostWithMedia } from "@/lib/postHelpers";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string; ref?: string }>;
}) {
  const { postId } = await params;
  const { media, ref } = await searchParams;

  const post = await getPostWithMedia(postId);

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
