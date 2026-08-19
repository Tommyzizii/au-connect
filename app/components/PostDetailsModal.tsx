"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Ellipsis, Flag, Pencil, Trash2, X } from "lucide-react";

import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";
import CommentType from "@/types/CommentType";
import MediaCarousel from "./MediaCarousel";
import {
  createComment,
  useDeletePost,
  useToggleSave,
  useTopLevelComments,
} from "../(main)/profile/utils/fetchfunctions";
import parseDate from "../(main)/profile/utils/parseDate";
import PostDetailsModalTypes from "@/types/PostDetailsModalTypes";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import JobPostDetailView from "./JobPostDetailView";
import ApplyJobPostModal from "./ApplyJobModal";
import { useApplyJob } from "../(main)/profile/utils/jobPostFetchFunctions";
import {
  JOB_APPLICANTS_PAGE_PATH,
  SINGLE_POST_API_PATH,
} from "@/lib/constants";
import PostDetailsSkeleton from "./PostDetailsSkeleton";
import PopupModal from "./PopupModal";
import ReportModal from "./ReportModal";
import { ReportTargetSnapshot } from "@/types/ReportTargetSnapshot";
import { ReportSubmitPayload } from "@/types/ReportSubmitPayload";
import { postReport } from "../(main)/profile/utils/reportFunctions";
import { useActorStore } from "@/lib/stores/actorStore";

type CreateCommentVariables = {
  postId: string;
  content: string;
  parentCommentId?: string;
  actorType?: "USER" | "COMMUNITY";
  communityId?: string | null;
};

type CachePost = {
  id: string;
  numOfComments?: number;
} & Record<string, unknown>;

type PostsCache = {
  pages: ({ posts: CachePost[] } & Record<string, unknown>)[];
} & Record<string, unknown>;

type SinglePostCache = {
  numOfComments?: number;
} & Record<string, unknown>;

type CommentsCache = {
  pages: ({ comments: CommentType[] } & Record<string, unknown>)[];
} & Record<string, unknown>;

type RepliesCache = {
  pages: ({ replies: CommentType[]; nextCursor?: string | null } & Record<
    string,
    unknown
  >)[];
  pageParams?: unknown[];
} & Record<string, unknown>;

export default function PostDetailsModal({
  currentUserId,
  postInfo,
  media,
  clickedIndex,
  onClose,
  onEdit,
}: PostDetailsModalTypes) {
  const router = useRouter();
  const selectedActor = useActorStore((state) => state.selectedActor);
  const { data: post, isLoading: postIsLoading } = useQuery({
    queryKey: ["post", postInfo.id, selectedActor],
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

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const displayPost = post ?? postInfo;
  const displayUsername = displayPost.username ?? postInfo.username;
  const displayProfilePic =
    displayPost.actorType === "COMMUNITY"
      ? displayPost.community?.profilePic || "/default_profile.jpg"
      : displayPost.profilePic ?? postInfo.profilePic;
  const reportTarget: ReportTargetSnapshot = {
    type: "POST",
    id: postInfo.id,
    username: displayUsername,
    profilePic: displayProfilePic,
    title: postInfo.title,
    content: postInfo.content,
    media: postInfo.media,
    links: postInfo.links
  }
  const handleReportSubmit = async (payload: ReportSubmitPayload) => {
    await postReport(payload);
  };

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
  const sizeVariant: "job" | "media" | "compact" = isJobPost
    ? "job"
    : hasMedia
      ? "media"
      : "compact";

  const showLeftPane =
    (isJobPost && !!postInfo.jobPost) ||
    postInfo.postType === "poll" ||
    hasMedia;

  const avatarUrl = useResolvedMediaUrl(
    displayProfilePic,
    "/default_profile.jpg",
  );

  const queryClient = useQueryClient();
  const commentsDisabled = postInfo.commentsDisabled ?? false;

  const [postMenuDropDownOpen, setPostMenuDropDownOpen] =
    useState<boolean>(false);

  const postOwner =
    postInfo.actorType === "COMMUNITY"
      ? selectedActor.type === "COMMUNITY" &&
        selectedActor.communityId === postInfo.communityId
      : currentUserId === postInfo.userId;
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);

  const deletePost = useDeletePost();
  const handleDelete = (postId: string) => {
    deletePost.mutate(postId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

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

  const createCommentMutation = useMutation<
    CommentType,
    Error,
    CreateCommentVariables
  >({
    mutationFn: (variables) => createComment(variables) as Promise<CommentType>,

    onSuccess: (newComment, variables) => {
      const bumpPostCommentCount = (oldData: PostsCache | undefined) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) =>
              p.id === variables.postId
                ? { ...p, numOfComments: (p.numOfComments ?? 0) + 1 }
                : p,
            ),
          })),
        };
      };

      const bumpSinglePostCommentCount = (
        oldPost: SinglePostCache | undefined,
      ) => {
        if (!oldPost) return oldPost;
        return {
          ...oldPost,
          numOfComments: (oldPost.numOfComments ?? 0) + 1,
        };
      };
      // ── TOP LEVEL COMMENT ──────────────────────────────────────────────────
      if (!variables.parentCommentId) {
        queryClient.setQueryData(
          ["comments", variables.postId],
          (oldData: CommentsCache | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page, index) =>
                index === 0
                  ? { ...page, comments: [newComment, ...page.comments] }
                  : page,
              ),
            };
          },
        );

        queryClient.setQueryData(["posts"], bumpPostCommentCount);
        queryClient.setQueriesData(
          { queryKey: ["profilePosts"] },
          bumpPostCommentCount,
        );
        queryClient.setQueriesData(
          { queryKey: ["profileJobPosts"] },
          bumpPostCommentCount,
        );
        queryClient.setQueryData(
          ["post", variables.postId],
          bumpSinglePostCommentCount,
        );

        return;
      }

      // ── REPLY ──────────────────────────────────────────────────────────────
      // 1. Append the new reply into the replies cache for this parent comment
      queryClient.setQueryData(
        ["replies", variables.postId, variables.parentCommentId],
        (oldData: RepliesCache | undefined) => {
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
            pages: oldData.pages.map((page, index) =>
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
        (oldData: CommentsCache | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              comments: page.comments.map((comment) =>
                comment.id === variables.parentCommentId
                  ? { ...comment, replyCount: (comment.replyCount ?? 0) + 1 }
                  : comment,
              ),
            })),
          };
        },
      );

      queryClient.setQueryData(["posts"], bumpPostCommentCount);
      queryClient.setQueriesData(
        { queryKey: ["profilePosts"] },
        bumpPostCommentCount,
      );
      queryClient.setQueriesData(
        { queryKey: ["profileJobPosts"] },
        bumpPostCommentCount,
      );
      queryClient.setQueryData(
        ["post", variables.postId],
        bumpSinglePostCommentCount,
      );
    },
  });

  if (postIsLoading) {
    return (
      <PostDetailsSkeleton
        onClose={onClose}
        sizeVariant={sizeVariant}
        showLeftPane={showLeftPane}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4 pb-4 pt-16 md:py-8 md:pl-8 md:pr-20"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close post details"
        className="absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:right-8 md:top-8 cursor-pointer"
      >
        <X className="h-7 w-7" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${
          isJobPost ? "max-w-[1100px]" : hasMedia ? "max-w-6xl" : "max-w-xl"
        } h-[calc(100vh-5rem)] rounded-lg flex overflow-hidden md:h-[calc(100vh-4rem)]`}
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
          {showLeftPane && (
            <div
              style={{
                width: "65%",
                minWidth: 0,
                flexShrink: 0,
                display: "flex",
                minHeight: 0,
                // backgroundColor: "#000", // optional, matches media background style
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
              width: showLeftPane ? "35%" : "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              borderLeft: showLeftPane ? "1px solid #e5e7eb" : "none",
            }}
          >
            <Header />
            <CommentsSection />
          </div>

            <ReportModal
              isOpen={reportModalOpen}
              onClose={() => {
                setPostMenuDropDownOpen(false);
                setReportModalOpen(false);
              }}
              target={reportTarget}
              onSubmit={handleReportSubmit}
            />
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
            if (!postInfo.jobPost?.id) {
              // console.log("No jobPostId, returning early");
              return;
            }

            await applyMutation.mutateAsync({
              postId: post.id,
              jobPostId: postInfo.jobPost.id,
              ...data,
            });
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
              {displayUsername}
            </div>

            <div className="text-xs text-gray-500">
              {parseDate(postInfo.createdAt || "")}
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="More post options"
              onClick={() => setPostMenuDropDownOpen(!postMenuDropDownOpen)}
              className="cursor-pointer p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <Ellipsis className="text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {postMenuDropDownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {postOwner ? (
                  <>
                    <button
                      type="button"
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setPostMenuDropDownOpen(false);
                        onEdit?.(post);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit post
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => {
                        setPostMenuDropDownOpen(false);
                        setDeletePopupOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete post
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 cursor-pointer"
                    onClick={() => {
                      setReportModalOpen(true);
                    }}
                  >
                    <Flag className="w-4 h-4" />
                    Report post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {(post.title || post.content) && (
          <div className="px-4 pb-4">
            {post.title && (
              <h2 className="font-semibold text-gray-900 text-[15px] mb-1">
                {post.title}
              </h2>
            )}

            {post.content && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            )}
          </div>
        )}

        {deletePopupOpen && (
          <PopupModal
            title="Delete Post?"
            titleText="Are you sure you want to delete this post?"
            actionText="Delete"
            open={deletePopupOpen}
            onClose={() => setDeletePopupOpen(false)}
            onConfirm={() => {
              setDeletePopupOpen(false);
              handleDelete?.(post.id);
            }}
          />
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
                actorType: selectedActor.type,
                communityId:
                  selectedActor.type === "COMMUNITY"
                    ? selectedActor.communityId
                    : null,
              });
            }}
          />
        </div>
      </>
    );
  }
}
