import { ThumbsUp, MessageCircle, Send } from "lucide-react";
import PostType from "@/types/Post";

export default function PostInteractionSection({
  post,
  commentCount,
  likePending,
  onLikeClicked,
  onCommentClicked,
  onShareClicked,
}: {
  post: PostType;
  commentCount: string;
  likePending: boolean;
  onLikeClicked: () => void;
  onCommentClicked: () => void;
  onShareClicked: () => void;
}) {
  return (
    <>
      {/* Likes, comments and share counts */}
      <div className="px-4 py-2">
        <div className="flex flex-row justify-end">
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {post.likeCount} likes
          </span>
          <span
            onClick={onCommentClicked}
            className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
          >
            {commentCount}
          </span>
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {post.shareCount || 0} shares
          </span>
        </div>
      </div>
      <div className="flex items-center justify-evenly py-4 border-t border-gray-200">
        <button
          className={`flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
            post.isLiked ? "text-red-600" : "text-gray-600 hover:text-red-600"
          }`}
          disabled={likePending}
          onClick={onLikeClicked}
        >
          <ThumbsUp
            className={`w-5 h-5 ${post.isLiked ? "fill-red-600" : ""}`}
          />
          <span>{post.isLiked ? "Liked" : "Like"}</span>
        </button>
        <button
          onClick={onCommentClicked}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button
          onClick={onShareClicked}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>
    </>
  );
}
