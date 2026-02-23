"use client";

import { BookOpen, BriefcaseBusiness, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import Post from "./Post";
import CreatePostModal from "./CreatePostModal";
import { MainFeedPropTypes } from "@/types/FeedPagePropTypes";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useFeedStore } from "@/lib/stores/feedStore";
import LeftProfile from "./Feed_LeftProfile";

export default function MainFeed({
  user,
  userLoading,
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
      <>
        <div className="w-full md:hidden block">
          <LeftProfile user={user} loading={userLoading} />
        </div>
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

          <div className="grid grid-cols-3 gap-1 sm:gap-2 md:flex md:justify-evenly md:gap-4">
            <button
              onClick={() => openModal("media")}
              className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] sm:text-xs md:flex-row md:gap-2 md:text-sm text-gray-600 hover:text-red-600 cursor-pointer rounded-lg hover:bg-gray-50"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Media</span>
            </button>
            <button
              onClick={() => openModal("article")}
              className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] sm:text-xs md:flex-row md:gap-2 md:text-sm text-gray-600 hover:text-red-600 cursor-pointer rounded-lg hover:bg-gray-50"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Write article</span>
            </button>
            <button
              onClick={() => openModal("job_post")}
              className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] sm:text-xs md:flex-row md:gap-2 md:text-sm text-gray-600 hover:text-red-600 cursor-pointer rounded-lg hover:bg-gray-50"
            >
              <BriefcaseBusiness className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Job Post</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="">
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
          <Post isLoading={true} skeletonVariant="job" />
          <Post isLoading={true} />
          <Post isLoading={true} skeletonVariant="job" />
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
