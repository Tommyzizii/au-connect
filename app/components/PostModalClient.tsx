"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import PostDetailsModal from "@/app/components/PostDetailsModal";
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
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });
  
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
