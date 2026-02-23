"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import PostDetailsModal, {
  PostDetailsSkeleton,
} from "@/app/components/PostDetailsModal";
import PostType from "@/types/Post";
import PostArg from "@/types/PostArg";

export default function PostModalClient({
  post,
  initialIndex,
}: {
  post: PostArg;
  initialIndex: number;
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

  if (userLoading || !user) {
    return (
      <PostDetailsSkeleton
        onClose={() => router.back()}
        sizeVariant={sizeVariant}
        showLeftPane={showLeftPane}
      />
    );
  }

  const postAsPostType = post as unknown as PostType;
  return (
    <PostDetailsModal
      currentUserId={user.id}
      postInfo={postAsPostType}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={initialIndex}
      onClose={() => router.back()}
    />
  );
}
