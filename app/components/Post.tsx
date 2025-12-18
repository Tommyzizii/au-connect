import { ThumbsUp, MessageCircle, Send } from "lucide-react";
import Image from "next/image";

import PostType from "@/types/Post";
import PostMediaGrid from "./PostMediaGrid";
import parseDate from "../profile/utils/parseDate";

export default function Post({
  post,
  isLoading,
}: {
  post?: PostType;
  isLoading: boolean;
}) {
  // Skeleton UI
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // If post is missing (should not happen), avoid crash
  if (!post) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-start gap-3 my-4 mx-5">
        <Image
          src={post.profilePic ? post.profilePic : "/default-profile"}
          width={50}
          height={50}
          alt={post.username ? post.username : "USER"}
          className="w-12 h-12 rounded-full"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{post.username}</h3>
          <p className="text-sm text-gray-500">{post.createdAt && parseDate(post.createdAt)}</p>
        </div>
      </div>

      {post.content && (
        <h4 className="font-medium text-gray-900 mb-3 mx-5">{post.content}</h4>
      )}

      {post.media && post.media.length > 0 && (
        <div className="">
          <PostMediaGrid media={post.media} isLoading={isLoading}/>
        </div>
      )}

      <div className="flex items-center justify-evenly py-4 border-t border-gray-200">
        <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
          <ThumbsUp className="w-5 h-5" />
          <span>Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
          <Send className="w-5 h-5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
