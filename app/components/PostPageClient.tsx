"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import PostDetailsModal from "@/app/components/PostDetailsModal";
import { SHARE_POST_API_PATH, POST_DETAIL_PAGE_PATH } from "@/lib/constants";
import PostType from "@/types/Post";
import { fetchUser } from "../profile/utils/fetchfunctions";

export default function PostPageClient({
  post,
  postId,
  initialIndex,
  hasRefShare,
}: {
  post: PostType;
  postId: string;
  initialIndex: number;
  hasRefShare: boolean;
}) {
  const router = useRouter();

  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  // Track share when someone visits via shared link
  useEffect(() => {
    if (hasRefShare) {
      // Call API to increment share count
      fetch(SHARE_POST_API_PATH(postId), {
        method: "POST",
      }).catch((err) => console.error("Failed to track share:", err));

      // Clean up URL
      router.replace(POST_DETAIL_PAGE_PATH(postId, initialIndex), {
        scroll: false,
      });
    }
  }, [hasRefShare, postId, initialIndex, router]);

  if (userLoading || !user) return null;

  return (
    <PostDetailsModal
      currentUserId={user?.id}
      postInfo={post}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={initialIndex}
      onClose={() => router.push("/")}
    />
  );
}
