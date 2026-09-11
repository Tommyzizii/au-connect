"use client";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Flag, Pencil, Trash2 } from "lucide-react";

import PostType from "@/types/Post";
import parseDate from "../(main)/profile/utils/parseDate";
import { buildSlug } from "../(main)/profile/utils/buildSlug";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { postReport } from "@/app/(main)/profile/utils/reportFunctions";
import PopupModal from "./PopupModal";
import ReportModal from "./ReportModal";
import type { ReportTargetSnapshot } from "@/types/ReportTargetSnapshot";
import type { ReportSubmitPayload } from "@/types/ReportSubmitPayload";
import { useActorStore } from "@/lib/stores/actorStore";

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
  const selectedActor = useActorStore((state) => state.selectedActor);
  const slug = buildSlug(post.username || "", post.userId || "");
  const communitySlug = post.community?.slug;
  const displayProfilePic =
    post.actorType === "COMMUNITY"
      ? post.community?.profilePic || DEFAULT_PROFILE_PIC
      : post.profilePic || DEFAULT_PROFILE_PIC;
  const resolvedProfilePicUrl = useResolvedMediaUrl(
    displayProfilePic,
    DEFAULT_PROFILE_PIC,
  );

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const reportTarget: ReportTargetSnapshot = {
    type: "POST",
    id: post.id,
    username: post.username,
    profilePic: displayProfilePic,
    title: post.title,
    content: post.content,
    media: post.media,
    links: post.links,
  };

  const isOwnPost =
    post.actorType === "COMMUNITY"
      ? selectedActor.type === "COMMUNITY" &&
        selectedActor.communityId === post.communityId
      : selectedActor.type === "USER" && currentUserId === post.userId;
  const canReportPost = selectedActor.type === "USER";
  const showPostMenu = isOwnPost || canReportPost;

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
  }, [postMenuDropDownOpen, setPostMenuDropDownOpen]);

  const handleProfileClick = (slug: string) => {
    if (post.actorType === "COMMUNITY" && communitySlug) {
      router.push(`/community/${communitySlug}`);
      return;
    }

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

  const handleReportSubmit = async (payload: ReportSubmitPayload) => {
    await postReport(payload);
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
          className="font-semibold text-gray-900 hover:text-blue-600 active:text-blue-700 hover:underline"
        >
          {post.username}
        </h3>
        <p className="text-sm text-gray-500">
          {post.createdAt && parseDate(post.createdAt)}
        </p>
      </div>

      {showPostMenu && (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          aria-label="More post options"
          onClick={() => setPostMenuDropDownOpen(!postMenuDropDownOpen)}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <Ellipsis className="text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        {postMenuDropDownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {isOwnPost ? (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit post
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete post
                </button>
              </>
            ) : canReportPost ? (
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setReportModalOpen(true);
                }}
              >
                <Flag className="w-4 h-4" />
                Report post
              </button>
            ) : null}
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

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
        }}
        target={reportTarget}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
