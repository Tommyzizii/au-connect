"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import CommentType from "@/types/CommentType";
import MediaCarousel from "./MediaCarousel";
import PostContentSection from "./PostContentSection";
import {
  createComment,
  useTopLevelComments,
} from "../profile/utils/fetchfunctions";
import parseDate from "../profile/utils/parseDate";
import PostDetailsModalTypes from "@/types/PostDetailsModalTypes";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import JobPostDetailView from "./JobPostDetailView";

export default function PostDetailsModal({
  currentUserId,
  postInfo,
  media,
  title,
  content,
  clickedIndex,
  onClose,
}: PostDetailsModalTypes) {
  const [mobileView, setMobileView] = useState<"content" | "comments">(
    "content",
  );

  const mediaList = media ?? [];
  const isJobPost = postInfo.postType === "job_post";
  const hasMedia = mediaList.length > 0 || postInfo.postType === "poll";

  const avatarUrl = useResolvedMediaUrl(
    postInfo.profilePic,
    "/default_profile.jpg",
  );

  const queryClient = useQueryClient();
  const commentsDisabled = postInfo.commentsDisabled ?? false;

  const {
    data,
    error,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopLevelComments(postInfo.id, commentsDisabled);

  const comments: CommentType[] =
    data?.pages.flatMap((page) => page.comments) ?? [];

  const createCommentMutation = useMutation({
    mutationFn: createComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });

      if (variables.parntCommentId) {
        queryClient.invalidateQueries({
          queryKey: ["replies", variables.parentCommentId],
        });
      }
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${
          isJobPost ? "max-w-[1100px]" : hasMedia ? "max-w-6xl" : "max-w-xl"
        } h-[90vh] rounded-lg flex overflow-hidden`}
        style={{
          display: "flex",
          maxWidth: isJobPost ? "1300px" : hasMedia ? "1100px" : "576px",
        }}
      >
        {/* ================= DESKTOP ================= */}
        <div
          className="hidden md:flex w-full h-full min-h-0"
          style={{
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* LEFT SIDE */}
          <div
            style={{
              width: "65%",
              minWidth: 0,
              flexShrink: 0,
              display: "flex",
              minHeight: 0,
            }}
          >
            {isJobPost && postInfo.jobPost ? (
              <JobPostDetailView
                jobData={postInfo.jobPost}
                isOwner={postInfo.userId === currentUserId}
              />
            ) : postInfo.postType === "poll" ? (
              <MediaCarousel
                postType={postInfo.postType}
                pollOptions={postInfo.pollOptions ?? []}
                pollVotes={postInfo.pollVotes}
                pollEndsAt={postInfo.pollEndsAt}
                mediaList={mediaList}
                clickedIndex={clickedIndex}
                onClose={onClose}
              />
            ) : hasMedia ? (
              <MediaCarousel
                postType={postInfo.postType ?? "media"}
                mediaList={mediaList}
                clickedIndex={clickedIndex}
                onClose={onClose}
              />
            ) : (
              <div className="p-6">
                <PostContentSection title={title} content={content} />
              </div>
            )}
          </div>

          {/* RIGHT SIDE (COMMENTS) */}
          <div
            className="border-l flex flex-col min-h-0"
            style={{
              width: "35%",
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <Header />
            <CommentsSection />
          </div>
        </div>

        {/* ================= MOBILE ================= */}
        <div className="flex flex-col md:hidden w-full h-full">
          {isJobPost ? (
            <>
              {/* Toggle (ONLY for job posts) */}
              <div className="flex border-b">
                <button
                  onClick={() => setMobileView("content")}
                  className={`flex-1 p-3 text-sm font-medium ${
                    mobileView === "content"
                      ? "border-b-2 border-black"
                      : "text-gray-500"
                  }`}
                >
                  Job
                </button>
                <button
                  onClick={() => setMobileView("comments")}
                  className={`flex-1 p-3 text-sm font-medium ${
                    mobileView === "comments"
                      ? "border-b-2 border-black"
                      : "text-gray-500"
                  }`}
                >
                  Comments
                </button>
              </div>

              {mobileView === "content" ? (
                <div className="flex-1 overflow-y-auto">
                  <JobPostDetailView
                    jobData={postInfo.jobPost!}
                    isOwner={postInfo.userId === currentUserId}
                  />
                </div>
              ) : (
                <div className="flex flex-col flex-1 min-h-0">
                  <Header />
                  <CommentsSection />
                </div>
              )}
            </>
          ) : (
            /* Normal posts = stacked layout */
            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Content first */}
              {postInfo.postType === "poll" ? (
                <MediaCarousel
                  postType={postInfo.postType}
                  pollOptions={postInfo.pollOptions ?? []}
                  pollVotes={postInfo.pollVotes}
                  pollEndsAt={postInfo.pollEndsAt}
                  mediaList={mediaList}
                  clickedIndex={clickedIndex}
                  onClose={onClose}
                />
              ) : hasMedia ? (
                <MediaCarousel
                  postType={postInfo.postType ?? "media"}
                  mediaList={mediaList}
                  clickedIndex={clickedIndex}
                  onClose={onClose}
                />
              ) : (
                <div className="p-6">
                  <PostContentSection title={title} content={content} />
                </div>
              )}

              {/* Then comments below */}
              <div className="border-t">
                <Header />
                <CommentsSection />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ================= INTERNAL COMPONENTS ================= */

  function Header() {
    return (
      <div className="flex items-center gap-3 p-4 border-b">
        <img
          src={avatarUrl}
          className="w-10 h-10 rounded-full object-cover"
          alt=""
        />
        <div>
          <div className="font-semibold text-sm text-gray-900">
            {postInfo.username}
          </div>
          <div className="text-xs text-gray-500">
            {parseDate(postInfo.createdAt || "")}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-gray-900 hover:text-gray-500"
        >
          ✕
        </button>
      </div>
    );
  }

  function CommentsSection() {
    if (commentsDisabled) {
      return (
        // Disabled comments message
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <p className="text-gray-600 font-medium">Comments are disabled</p>
            <p className="text-gray-500 text-sm mt-1">
              The author has turned off commenting for this post
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial loading */}
          {isLoading && (
            <div className="text-sm text-gray-500">Loading comments...</div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-sm text-red-500">Failed to load comments</div>
          )}

          {/* Render comments */}
          {!isLoading &&
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                postId={postInfo.id}
                comment={comment}
                createCommentMutation={createCommentMutation}
              />
            ))}

          {/* Empty state */}
          {!isLoading && comments.length === 0 && (
            <div className="text-sm text-gray-500">
              No comments yet. Be the first 👀
            </div>
          )}

          {/* Load more comments */}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="block mx-auto text-sm text-blue-500 hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage
                ? "Loading more..."
                : comments.length > 15 && "Load more comments"}
            </button>
          )}

          {/* error handling */}
          {isError && (
            <div className="text-sm text-red-500">
              {error instanceof Error
                ? error.message
                : "Something went wrong while loading comments"}
            </div>
          )}
        </div>
        {/* Comment input */}
        <div className="border-t p-3">
          <CommentInput
            isLoading={createCommentMutation.isPending}
            onSubmit={(text) => {
              createCommentMutation.mutate({
                postId: postInfo.id,
                content: text, // no parentId for top-level
              });
            }}
          />
        </div>
      </>
    );
  }
}
