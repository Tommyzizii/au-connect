"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import CommentType from "@/types/CommentType";
import MediaCarousel from "./MediaCarousel";
import {
  createComment,
  useToggleSave,
  useTopLevelComments,
} from "../profile/utils/fetchfunctions";
import parseDate from "../profile/utils/parseDate";
import PostDetailsModalTypes from "@/types/PostDetailsModalTypes";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import JobPostDetailView from "./JobPostDetailView";
import ApplyJobPostModal from "./ApplyJobModal";
import { useApplyJob } from "../profile/utils/jobPostFetchFunctions";
import {
  JOB_APPLICANTS_PAGE_PATH,
  SINGLE_POST_API_PATH,
} from "@/lib/constants";

export default function PostDetailsModal({
  currentUserId,
  postInfo,
  media,
  title,
  content,
  clickedIndex,
  onClose,
}: PostDetailsModalTypes) {
  const router = useRouter();
  const { data: post, isLoading: postIsLoading } = useQuery({
    queryKey: ["post", postInfo.id],
    queryFn: async () => {
      const res = await fetch(SINGLE_POST_API_PATH(postInfo.id));
      if (!res.ok) throw new Error("Failed to fetch post");
      return res.json();
    },
    initialData: postInfo,
  });

  const [applyJobModalOpen, setApplyJobModalOpen] = useState(false);
  const saveMutation = useToggleSave();
  const applyMutation = useApplyJob();
  const [mobileView, setMobileView] = useState<"content" | "comments">(
    "content",
  );

  const handleJobApply = (
    allowedExternalApply: boolean,
    externalApplyLink?: string,
  ) => {
    if (allowedExternalApply && externalApplyLink) {
      window.open(externalApplyLink, "_blank", "noopener,noreferrer");
    } else {
      setApplyJobModalOpen(true);
    }
  };

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
    data?.pages
      .flatMap((page) => page.comments)
      .filter(
        (comment, index, self) =>
          index === self.findIndex((c) => c.id === comment.id),
      ) ?? [];

  // Drop-in replacement for the createCommentMutation in PostDetailsModal.tsx

  const createCommentMutation = useMutation({
    mutationFn: createComment,

    onSuccess: (newComment, variables) => {
      // ── TOP LEVEL COMMENT ──────────────────────────────────────────────────
      if (!variables.parentCommentId) {
        queryClient.setQueryData(
          ["comments", variables.postId],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any, index: number) =>
                index === 0
                  ? { ...page, comments: [newComment, ...page.comments] }
                  : page,
              ),
            };
          },
        );
        return;
      }

      // ── REPLY ──────────────────────────────────────────────────────────────
      // 1. Append the new reply into the replies cache for this parent comment
      queryClient.setQueryData(
        ["replies", variables.postId, variables.parentCommentId],
        (oldData: any) => {
          if (!oldData) {
            // Replies were never fetched yet — seed the cache from scratch
            // so the panel can open and show the new reply immediately
            return {
              pages: [{ replies: [newComment], nextCursor: null }],
              pageParams: [null],
            };
          }
          return {
            ...oldData,
            pages: oldData.pages.map((page: any, index: number) =>
              index === 0
                ? { ...page, replies: [...page.replies, newComment] }
                : page,
            ),
          };
        },
      );

      // 2. Bump replyCount on the parent comment in the top-level comments cache
      //    so the "View replies (n)" button appears / shows the correct number.
      queryClient.setQueryData(
        ["comments", variables.postId],
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              comments: page.comments.map((comment: any) =>
                comment.id === variables.parentCommentId
                  ? { ...comment, replyCount: (comment.replyCount ?? 0) + 1 }
                  : comment,
              ),
            })),
          };
        },
      );
    },
  });

  const shouldShowLeft =
    (isJobPost && postInfo.jobPost) || postInfo.postType === "poll" || hasMedia;

  if (postIsLoading) {
    return <PostDetailsSkeleton onClose={onClose} />;
  }

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
          {shouldShowLeft && (
            <div
              style={{
                width: "65%",
                minWidth: 0,
                flexShrink: 0,
                display: "flex",
                minHeight: 0,
                backgroundColor: "#000", // optional, matches media background style
              }}
            >
              {isJobPost && postInfo.jobPost ? (
                <JobPostDetailView
                  jobData={postInfo.jobPost}
                  isOwner={postInfo.userId === currentUserId}
                  hasApplied={post.jobPost?.hasApplied}
                  applicationStatus={post.jobPost?.applicationStatus}
                  isSaved={post.isSaved}
                  onApply={() =>
                    handleJobApply(
                      postInfo.jobPost?.allowExternalApply ?? false,
                      postInfo.jobPost?.applyUrl ?? "",
                    )
                  }
                  onSave={() => saveMutation.mutate(post.id)}
                  onViewApplicants={() => {
                    router.push(JOB_APPLICANTS_PAGE_PATH(post.id));
                  }}
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
                /* Empty state placeholder */
                <div className="flex items-center justify-center w-full h-full bg-black">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                        strokeWidth="2"
                      />
                      <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                      <path strokeWidth="2" d="M21 15l-5-5L5 21" />
                    </svg>

                    <p className="text-sm">No media</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RIGHT SIDE (COMMENTS) */}
          <div
            style={{
              width: shouldShowLeft ? "35%" : "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              borderLeft: shouldShowLeft ? "1px solid #e5e7eb" : "none",
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
                      ? "border-b-2 border-black text-black"
                      : "text-neutral-600"
                  }`}
                >
                  Job
                </button>
                <button
                  onClick={() => setMobileView("comments")}
                  className={`flex-1 p-3 text-sm font-medium ${
                    mobileView === "comments"
                      ? "border-b-2 border-black text-black"
                      : "text-neutral-600"
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
              ) : (
                hasMedia && (
                  <MediaCarousel
                    postType={postInfo.postType ?? "media"}
                    mediaList={mediaList}
                    clickedIndex={clickedIndex}
                    onClose={onClose}
                  />
                )
              )}

              {/* Then comments below */}
              <div className="border-t">
                <Header />
                <CommentsSection />
              </div>
            </div>
          )}
        </div>

        <ApplyJobPostModal
          isOpen={applyJobModalOpen}
          onClose={() => setApplyJobModalOpen(false)}
          jobTitle={postInfo.jobPost?.jobTitle || ""}
          companyName={postInfo.jobPost?.companyName}
          onSubmit={async (data) => {
            console.log("Parent onSubmit called");
            console.log("jobPostId:", postInfo.jobPost?.id);

            if (!postInfo.jobPost?.id) {
              console.log("No jobPostId, returning early");
              return;
            }

            console.log("Calling mutation now");

            await applyMutation.mutateAsync({
              postId: post.id,
              jobPostId: postInfo.jobPost.id,
              ...data,
            });

            console.log("Mutation finished");
          }}
        />
      </div>
    </div>
  );

  /* ================= INTERNAL COMPONENTS ================= */

  function Header() {
    return (
      <div className="border-b">
        <div className="flex items-center gap-3 p-4">
          <img
            src={avatarUrl}
            className="w-10 h-10 rounded-full object-cover"
            alt=""
          />

          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-900">
              {postInfo.username}
            </div>

            <div className="text-xs text-gray-500">
              {parseDate(postInfo.createdAt || "")}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-900 hover:text-gray-500"
          >
            ✕
          </button>
        </div>

        {(title || content) && (
          <div className="px-4 pb-4">
            {title && (
              <h2 className="font-semibold text-gray-900 text-[15px] mb-1">
                {title}
              </h2>
            )}

            {content && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {content}
              </p>
            )}
          </div>
        )}
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

function PostDetailsSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl h-[90vh] rounded-lg flex overflow-hidden"
      >
        <div className="flex flex-col w-full animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="w-10 h-10 bg-gray-300 rounded-full" />

            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 bg-gray-300 rounded" />
              <div className="h-2 w-16 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="px-4 py-3 space-y-3 border-b">
            <div className="h-4 w-3/4 bg-gray-300 rounded" />
            <div className="h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 w-5/6 bg-gray-200 rounded" />
          </div>

          {/* Comments skeleton */}
          <div className="flex-1 p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-300 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
