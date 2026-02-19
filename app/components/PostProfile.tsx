"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";

import PostType from "@/types/Post";
import parseDate from "../(main)/profile/utils/parseDate";
import { buildSlug } from "../(main)/profile/utils/buildSlug";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import PopupModal from "./PopupModal";

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

interface PostProfileProps {
  post: PostType;
  currentUserId?: string; // Pass the current logged-in user's ID
  postMenuDropDownOpen: boolean;
  setPostMenuDropDownOpen: (state: boolean) => void;
  popupOpen: boolean;
  setPopupOpen: (state: boolean) => void;
  onEdit?: () => void;
  onDelete?: (postId: string) => void;
}

export default function PostProfile({
  post,
  currentUserId,
  postMenuDropDownOpen,
  setPostMenuDropDownOpen,
  popupOpen,
  setPopupOpen,
  onEdit,
  onDelete,
}: PostProfileProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const slug = buildSlug(post.username || "", post.userId || "");
  const resolvedProfilePicUrl = useResolvedMediaUrl(
    post.profilePic,
    DEFAULT_PROFILE_PIC,
  );

  // Check if current user owns this post
  const isOwnPost = currentUserId === post.userId;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setPostMenuDropDownOpen(false);
      }
    }

    if (postMenuDropDownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [postMenuDropDownOpen]);

  const handleProfileClick = (slug: string) => {
    if (!slug) return;
    router.push(`/profile/${slug}`);
  };

  const handleEdit = () => {
    setPostMenuDropDownOpen(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setPostMenuDropDownOpen(false);
    setPopupOpen(true);
  };

  return (
    <div className="flex justify-center items-start gap-3 my-4 mx-5">
      <Image
        src={resolvedProfilePicUrl}
        width={50}
        height={50}
        alt={post.username ? post.username : "USER"}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <h3
          onClick={() => handleProfileClick(slug)}
          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 active:text-blue-700 hover:underline"
        >
          {post.username}
        </h3>
        <p className="text-sm text-gray-500">
          {post.createdAt && parseDate(post.createdAt)}
        </p>
      </div>

      {/* Only show menu if user owns the post */}
      {isOwnPost && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setPostMenuDropDownOpen(!postMenuDropDownOpen)}
            className="cursor-pointer p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Ellipsis className="text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {postMenuDropDownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={handleEdit}
                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit post
              </button>
              <button
                onClick={handleDelete}
                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete post
              </button>
            </div>
          )}
        </div>
      )}

      {popupOpen && (
        <PopupModal
          title="Delete Post?"
          titleText="Are you sure you want to delete this post?"
          actionText="Delete"
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          onConfirm={() => {
            setPopupOpen(false);
            onDelete?.(post.id);
          }}
        />
      )}
    </div>
  );
}
