"use client";
import Post from "./Post";

import { MainFeedPropTypes } from "@/types/FeedPagePropTypes";
import { BookOpen, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export default function MainFeed({ user, posts, loading }: MainFeedPropTypes) {
  return (
    <div className="col-span-6 space-y-4">
      {/* CREATE POST */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10">
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="rounded-full object-cover"
            />
          </div>
          <input
            type="text"
            placeholder="What's new Today?"
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
          />
        </div>
        <div className="flex gap-4 pl-13">
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <ImageIcon className="w-5 h-5" />
            <span>Media</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <BookOpen className="w-5 h-5" />
            <span>Write Article</span>
          </button>
        </div>
      </div>

      {/* POSTS */}
      {loading ? (
        <>
          <Post isLoading={true} />
          <Post isLoading={true} />
        </>
      ) : (
        posts.map(
          (post) => post && <Post key={post.id} post={post} isLoading={false} />
        )
      )}
    </div>
  );
}
