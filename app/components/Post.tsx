import { ThumbsUp, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

import PostType from "@/types/Post";
import User from "@/types/User";
import PostMediaGrid from "./PostMediaGrid";
import PostProfile from "./PostProfile";
import PostAttachments from "./PostAttachments";
import PostText from "./PostText";
import PostDetailsModal from "./PostDetailsModal";
import {
  useToggleLike,
  useDeletePost,
  useEditPost,
} from "../profile/utils/fetchfunctions";
import CreatePostModal from "./CreatePostModal";

export default function Post({
  user,
  post,
  isLoading,
}: {
  user?: User;
  post?: PostType;
  isLoading: boolean;
}) {
  const [postModalOpen, setPostModelOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const editPostMutation = useEditPost();

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

  const videosAndImages = post.media?.filter(
    (m) => m.type === "image" || m.type === "video",
  );

  const containsVideosOrImages = (videosAndImages?.length ?? 0) > 0;
  const attachments = post.media?.filter((m) => m.type === "file");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <PostProfile
        post={post}
        currentUserId={user?.id}
        onDelete={(postId: string) => {
          deletePost.mutate(postId);
        }}
        onEdit={() => {
          setEditModalOpen(true);
        }}
      />

      {post.content && <PostText text={post.content} />}

      {containsVideosOrImages && (
        <PostMediaGrid
          postInfo={{
            id: post.id,
            username: post.username,
            profilePic: post.profilePic,
            createdAt: post.createdAt,
          }}
          media={videosAndImages}
          title={post.title ? post.title : null}
          content={post.content}
          isLoading={isLoading}
        />
      )}

      {attachments && attachments.length > 0 && (
        <PostAttachments
          media={attachments}
          addMargin={containsVideosOrImages ? true : false}
        />
      )}

      {/* likes, comments and share counts */}
      <div className="px-4 py-2">
        <div className="flex flex-row justify-end">
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {post.likeCount} likes
          </span>
          <span
            onClick={() => setPostModelOpen(true)}
            className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
          >
            {post.numOfComments && post.numOfComments > 0
              ? `${post.numOfComments} comments`
              : "0 comments"}
          </span>
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {123} shares
          </span>
        </div>
      </div>

      <div className="flex items-center justify-evenly py-4 border-t border-gray-200">
        <button
          className={`flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
            post.isLiked ? "text-red-600" : "text-gray-600 hover:text-red-600"
          }`}
          disabled={toggleLike.isPending}
          onClick={() =>
            toggleLike.mutate({
              postId: post.id,
              isLiked: post.isLiked ?? false,
            })
          }
        >
          <ThumbsUp
            className={`w-5 h-5 ${post.isLiked ? "fill-red-600" : ""}`}
          />
          <span>{post.isLiked ? "Liked" : "Like"}</span>
        </button>
        <button
          onClick={() => setPostModelOpen(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer">
          <Send className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>

      {postModalOpen && (
        <PostDetailsModal
          postInfo={{
            id: post.id,
            username: post.username,
            profilePic: post.profilePic,
            createdAt: post.createdAt,
          }}
          media={post.media}
          title={post.title}
          content={post.content}
          clickedIndex={0}
          onClose={() => setPostModelOpen(false)}
        />
      )}

      {editModalOpen && (
        <CreatePostModal
          user={user || { id: "", username: "unknown", slug: "slug" }}
          isOpen={editModalOpen}
          setIsOpen={setEditModalOpen}
          editMode={true}
          exisistingPost={post}
        />
      )}
    </div>
  );
}
