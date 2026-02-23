"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import PostDetailsModal, {
  PostDetailsSkeleton,
} from "@/app/components/PostDetailsModal";
import { SHARE_POST_API_PATH, POST_DETAIL_PAGE_PATH } from "@/lib/constants";
import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import PostArg from "@/types/PostArg";
import PostType from "@/types/Post";

export default function PostPageClient({
  post,
  postId,
  initialIndex,
  hasRefShare,
  sharedByUserId,
}: {
  post: PostArg;
  postId: string;
  initialIndex: number;
  hasRefShare: boolean;
  sharedByUserId?: string | null;
}) {
  const router = useRouter();

  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const isJobPost = post.postType === "job_post";
  const hasMedia = (post.media?.length ?? 0) > 0 || post.postType === "poll";
  const sizeVariant: "job" | "media" | "compact" = isJobPost
    ? "job"
    : hasMedia
      ? "media"
      : "compact";
  const showLeftPane =
    (isJobPost && !!post.jobPost) || post.postType === "poll" || hasMedia;

  // Track share when someone visits via shared link
  useEffect(() => {
    if (hasRefShare) {
      // Call API to increment share count
      fetch(SHARE_POST_API_PATH(postId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharedByUserId: sharedByUserId ?? undefined,
        }),
      }).catch((err) => console.error("Failed to track share:", err));

      // Clean up URL
      router.replace(POST_DETAIL_PAGE_PATH(postId, initialIndex), {
        scroll: false,
      });
    }
  }, [hasRefShare, postId, initialIndex, router, sharedByUserId]);

  if (userLoading || !user) {
    return (
      <PostDetailsSkeleton
        onClose={() => router.push("/")}
        sizeVariant={sizeVariant}
        showLeftPane={showLeftPane}
      />
    );
  }
  const postAsPostType = post as unknown as PostType;

  return (
    <PostDetailsModal
      currentUserId={user?.id}
      postInfo={postAsPostType}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={initialIndex}
      onClose={() => router.push("/")}
    />
  );
}
