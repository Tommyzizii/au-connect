"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import PostDetailsModal from "@/app/components/PostDetailsModal";
import PostType from "@/types/Post";

export default function PostModalClient({
  post,
  initialIndex,
}: {
  post: PostType;
  initialIndex: number;
}) {
  const router = useRouter();

  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  return (
    <PostDetailsModal
      currentUserId={user.id}
      postInfo={post}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={initialIndex}
      onClose={() => router.back()}
    />
  );
}
