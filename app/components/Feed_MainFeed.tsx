"use client"

import { BookOpen, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Virtuoso } from 'react-virtuoso';

import Post from "./Post";
import CreatePostModal from "./CreatePostModal";
import { MainFeedPropTypes } from "@/types/FeedPagePropTypes";

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const openModal = (postType: string) => {
    setSelectedPostType(postType);
    setIsCreatePostModalOpen(true);
  };

  const enableSuccessModal = () => {
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
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
  const CreatePostCard = () => (
    <div className="bg-white md:rounded-lg border border-gray-200 p-4 pt-7 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-10 h-10">
          <Image
            src={user.profilePic ? user.profilePic : "/default_profile.jpg"}
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

  return (
    <div className="lg:col-span-6 md:col-span-7">
      {isCreatePostModalOpen && (
        <CreatePostModal
          user={user}
          isOpen={isCreatePostModalOpen}
          setIsOpen={setIsCreatePostModalOpen}
          initialType={selectedPostType}
          enableSuccessModal={enableSuccessModal}
        />
      )}

      {/* EVERYTHING IN ONE SCROLLABLE LIST */}
      {loading ? (
        <div className="space-y-4">
          <Post isLoading={true} />
          <Post isLoading={true} />
        </div>
      ) : (
        <div style={{ height: 'calc(100vh - 97px)' }}>
          <Virtuoso
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
                  <Post key={post.id} post={post} isLoading={false} />
                </div>
              );
            }}
          />
        </div>
      )}

      {/* Show SuccessModal */}
      <div
        className={`fixed bottom-10 left-5 z-50 w-67 flex justify-center transition-all duration-300 
      ${
        showSuccessModal
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      >
        <div className="rounded-xl bg-green-500 text-white px-5 py-3 shadow-lg shadow-green-200">
          Post created successfully 🎉
        </div>
      </div>
    </div>
  );
}
