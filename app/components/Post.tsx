"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import PostType from "@/types/Post";
import User from "@/types/User";
import PostMediaGrid from "./PostMediaGrid";
import PostProfile from "./PostProfile";
import PostAttachments from "./PostAttachments";
import PostText from "./PostText";
import {
  useToggleLike,
  useDeletePost,
  useToggleSave,
} from "../(main)/profile/utils/fetchfunctions";
import CreatePostModal from "./CreatePostModal";

import ShareModal from "../(main)/profile/components/ShareModal";
import {
  JOB_APPLICANTS_PAGE_PATH,
  POST_DETAIL_PAGE_PATH,
} from "@/lib/constants";

import PostPoll from "./PostPoll";
import LinkEmbedPreview from "./Linkembedpreview";
import { JobPostCard } from "./JobPostCard";
import PostInteractionSection from "./PostInteractionSection";
import ApplyJobModal from "./ApplyJobModal";
import { useApplyJob } from "../(main)/profile/utils/jobPostFetchFunctions";

export default function Post({
  user,
  post,
  isLoading,
  skeletonVariant = "default",
}: {
  user?: User;
  post?: PostType;
  isLoading: boolean;
  skeletonVariant?: "default" | "job";
}) {
  const router = useRouter();
  const openPostModal = (postId: string, index: number) => {
    router.push(POST_DETAIL_PAGE_PATH(postId, index));
  };

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [postMenuDropDownOpen, setPostMenuDropDownOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [applyJobModalOpen, setApplyJobModalOpen] = useState(false);

  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const applyMutation = useApplyJob();
  const toggleSaveMutation = useToggleSave();

  // Skeleton UI
  if (isLoading) {
    if (skeletonVariant === "job") {
      return (
        <div className="bg-white rounded-lg border border-gray-200 animate-pulse">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-200" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-5 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-1/3 rounded bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="h-9 rounded bg-gray-200" />
              <div className="h-9 rounded bg-gray-200" />
            </div>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
        </div>
      );
    }

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

  if (!post) return null;

  const videosAndImages = post.media?.filter(
    (m) => m.type === "image" || m.type === "video",
  );

  const containsVideosOrImages = (videosAndImages?.length ?? 0) > 0;
  const attachments = post.media?.filter((m) => m.type === "file");

  const numOfCommentsContent = (post: PostType) => {
    if (post.commentsDisabled) {
      return "";
    }

    if (post.numOfComments && post.numOfComments > 0) {
      return `${post.numOfComments} comments`;
    }

    return "0 comments";
  };

  let content = {};
  if (post.postType === "job_post" && post.jobPost) {
    content = (
      <>
        <div className="bg-white border border-gray-200 rounded-lg">
          <JobPostCard
            post={post}
            job={post.jobPost}
            isOwner={post.userId === user?.id}
            hasApplied={post.jobPost?.hasApplied ?? false}
            applicationStatus={post.jobPost?.applicationStatus ?? "APPLIED"}
            isSaved={post.isSaved ?? false}
            postMenuDropDownOpen={postMenuDropDownOpen}
            setPostMenuDropDownOpen={(state: boolean) =>
              setPostMenuDropDownOpen(state)
            }
            popupOpen={popupOpen}
            setPopupOpen={(state: boolean) => setPopupOpen(state)}
            onTitleClick={() => openPostModal(post.id, 0)}
            onEdit={() => {
              setEditModalOpen(true);
            }}
            onDelete={(postId: string) => {
              deletePost.mutate(postId);
            }}
            onApply={() => setApplyJobModalOpen(true)}
            onSaveToggle={() => toggleSaveMutation.mutate(post.id)}
            onViewApplicants={() => {
              router.push(JOB_APPLICANTS_PAGE_PATH(post.id));
            }}
          />
          <PostInteractionSection
            post={post}
            likePending={toggleLike.isPending}
            commentCount={numOfCommentsContent(post)}
            onLikeClicked={() => {
              toggleLike.mutate({
                postId: post.id,
                isLiked: post.isLiked ?? false,
              });
            }}
            onCommentClicked={() => openPostModal(post.id, 0)}
            onShareClicked={() => {
              console.log("Share clicked", shareModalOpen);
              setShareModalOpen(true);
            }}
          />
        </div>
      </>
    );
  } else {
    content = (
      <div className="bg-white border border-gray-200 rounded-lg">
        <PostProfile
          post={post}
          currentUserId={user?.id}
          postMenuDropDownOpen={postMenuDropDownOpen}
          setPostMenuDropDownOpen={(state: boolean) =>
            setPostMenuDropDownOpen(state)
          }
          popupOpen={popupOpen}
          setPopupOpen={(state: boolean) => setPopupOpen(state)}
          onDelete={(postId: string) => {
            deletePost.mutate(postId);
          }}
          onEdit={() => {
            setEditModalOpen(true);
          }}
        />

        {post.title && (
          <div className="px-5 mt-2 mb-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {post.title}
            </h2>
          </div>
        )}

        {post.content && <PostText text={post.content} />}

        {/* Poll UI */}
        {post.postType === "poll" && post.pollOptions && (
          <PostPoll
            postId={post.id}
            options={post.pollOptions}
            votes={post.pollVotes}
            endsAt={post.pollEndsAt}
            currentUserId={user?.id}
          />
        )}

        {/* Media Grid */}
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
            onClick={(index) => openPostModal(post.id, index)}
          />
        )}

        {/* File Attachments */}
        {attachments && attachments.length > 0 && (
          <PostAttachments
            media={attachments}
            addMargin={containsVideosOrImages ? true : false}
          />
        )}

        {/* Link Embeds - NEW */}
        {post.links && post.links.length > 0 && (
          <LinkEmbedPreview links={post.links} editable={false} />
        )}

        <PostInteractionSection
          post={post}
          likePending={toggleLike.isPending}
          commentCount={numOfCommentsContent(post)}
          onLikeClicked={() => {
            toggleLike.mutate({
              postId: post.id,
              isLiked: post.isLiked ?? false,
            });
          }}
          onCommentClicked={() => openPostModal(post.id, 0)}
          onShareClicked={() => setShareModalOpen(true)}
        />

        {/* Edit Post Modal */}
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

  return (
    <>
      {content}

      {/* Edit Post Modal */}
      {editModalOpen && (
        <CreatePostModal
          user={user || { id: "", username: "unknown", slug: "slug" }}
          isOpen={editModalOpen}
          setIsOpen={setEditModalOpen}
          editMode={true}
          exisistingPost={post}
        />
      )}

      <ApplyJobModal
        isOpen={applyJobModalOpen}
        onClose={() => setApplyJobModalOpen(false)}
        jobTitle={post.jobPost?.jobTitle || ""}
        companyName={post.jobPost?.companyName}
        onSubmit={async (data) => {
          if (!post.jobPost?.id) {
            console.log("No jobPostId, returning early");
            return;
          }
          await applyMutation.mutateAsync({
            postId: post.id,
            jobPostId: post.jobPost.id,
            ...data,
          });
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={`${window.location.origin}${POST_DETAIL_PAGE_PATH(
          post.id,
          0,
          "share",
          user?.id,
        )}`}
      />
    </>
  );
}
