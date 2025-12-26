import { ThumbsUp, MessageCircle, Send } from "lucide-react";

import PostType from "@/types/Post";
import PostMediaGrid from "./PostMediaGrid";
import parseDate from "../profile/utils/parseDate";
import PostAttachments from "./PostAttachments";
import PostText from "./PostText";
import Image from "next/image";

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

  const videosAndImages = post.media?.filter(
    (m) => m.type === "image" || m.type === "video"
  );

  const containsVideosOrImages =
    videosAndImages?.length && videosAndImages.length > 0;

  const attachments = post.media?.filter((m) => m.type === "file");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div
        className="flex items-start gap-3 my-4 mx-5"
        onClick={() => {
          window.alert("go to that profile");
        }}
      >
        {post.profilePic ? (
          <Image
            src={post.profilePic}
            width={50}
            height={50}
            alt={post.username ? post.username : "USER"}
            className="w-12 h-12 rounded-full"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default_cover.jpg";
            }}
          />
        ) : (
          <Image
            src={"/default_cover.jpg"}
            width={50}
            height={50}
            alt={post.username ? post.username : "USER"}
            className="w-12 h-12 rounded-full"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/default_cover.jpg";
            }}
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{post.username}</h3>
          {/* <h3 className="text-[10px] text-gray-900">{`${100} followers`}</h3> */}
          <p className="text-sm text-gray-500">
            {post.createdAt && parseDate(post.createdAt)}
          </p>
        </div>
      </div>

      {post.content && <PostText text={post.content} />}

      {containsVideosOrImages && (
        <PostMediaGrid media={videosAndImages} isLoading={isLoading} />
      )}

      {attachments && attachments.length > 0 && (
        <PostAttachments
          media={attachments}
          addMargin={containsVideosOrImages ? true : false}
        />
      )}

      {/* likes and share counts */}
      <div className="px-4 py-2">
        <div className="flex flex-row justify-end">
          <span className="text-gray-500 mr-3">1000 likes</span>
          <span className="text-gray-500">123 shares</span>
        </div>
      </div>

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
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
