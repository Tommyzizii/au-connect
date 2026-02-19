"use client";

import { BookOpen, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import Post from "./Post";
import CreatePostModal from "./CreatePostModal";
import { MainFeedPropTypes } from "@/types/FeedPagePropTypes";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useFeedStore } from "@/lib/stores/feedStore";

export default function MainFeed({
  user,
  posts,
  loading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: MainFeedPropTypes) {
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState("media");

  const virtuosoRef = useRef<VirtuosoHandle>(null!);
  const setVirtuosoRef = useFeedStore((s) => s.setVirtuosoRef);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const openModal = (postType: string) => {
    setSelectedPostType(postType);
    setIsCreatePostModalOpen(true);
  };

  // Footer component for loading indicator
  const Footer = () => {
    if (!isFetchingNextPage) return null;
    return (
      <div className="text-center text-sm text-gray-500 py-4">
        Loading more posts...
      </div>
    );
  };

  // Create Post Card Component (to be rendered inside Virtuoso)
  const CreatePostCard = () => {
    const avatarUrl = useResolvedMediaUrl(
      user?.profilePic,
      "/default_profile.jpg",
    );

    return (
      <div className="bg-white md:rounded-lg border border-gray-200 p-4 pt-7 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10">
            <Image
              src={avatarUrl}
              alt={user.username}
              fill
              className="rounded-full object-cover"
            />
          </div>
          <button
            onClick={() => setIsCreatePostModalOpen(true)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none active:bg-gray-100 hover:bg-gray-200 text-left"
          >
            {"Share your ideas"}
          </button>
        </div>

        <div className="flex justify-evenly gap-4 pl-13">
          <button
            onClick={() => openModal("discussion")}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Discussion</span>
          </button>
          <button
            onClick={() => openModal("media")}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
            <span>Media</span>
          </button>
          <button
            onClick={() => openModal("article")}
            className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            <span>Write Article</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="lg:col-span-6 md:col-span-7">
      {isCreatePostModalOpen && (
        <CreatePostModal
          user={user}
          isOpen={isCreatePostModalOpen}
          setIsOpen={setIsCreatePostModalOpen}
          initialType={selectedPostType}
        />
      )}

      {/* EVERYTHING IN ONE SCROLLABLE LIST */}
      {loading ? (
        <div className="space-y-4">
          <Post isLoading={true} />
          <Post isLoading={true} />
        </div>
      ) : (
        <div style={{ height: "calc(100vh - 97px)" }}>
          <Virtuoso
            ref={(ref) => {
              if (ref) {
                virtuosoRef.current = ref;
                setVirtuosoRef(virtuosoRef);
              }
            }}
            data={posts}
            endReached={loadMore}
            overscan={200}
            components={{
              Header: CreatePostCard,
              Footer,
            }}
            itemContent={(index, post) => {
              if (!post) return null;
              return (
                <div className="mb-4">
                  <Post
                    key={post.id}
                    user={user}
                    post={post}
                    isLoading={false}
                  />
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
