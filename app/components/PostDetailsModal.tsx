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

export default function PostDetailsModal({
  postInfo,
  media,
  title,
  content,
  clickedIndex,
  onClose,
}: PostDetailsModalTypes) {
  const mediaList = media ?? [];
  const hasMedia = mediaList.length > 0;

  const queryClient = useQueryClient();

  const {
    data,
    error,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopLevelComments(postInfo.id);

  const comments: CommentType[] =
    data?.pages.flatMap((page) => page.comments) ?? [];

  const createCommentMutation = useMutation({
    mutationFn: createComment,

    onSuccess: (newComment, variables) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { postId, parentId } = variables;

      queryClient.invalidateQueries({
        queryKey: ["comments", postId],
      });
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${
          hasMedia ? "max-w-6xl md:flex-row" : "max-w-xl"
        } h-[90vh] rounded-lg overflow-hidden flex`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT: Media carousel */}

        {/* show media carousel only if the post contains images */}
        {hasMedia && (
          <MediaCarousel
            mediaList={mediaList}
            clickedIndex={clickedIndex}
            onClose={onClose}
          />
        )}

        {/* RIGHT: Post details + comments */}
        <div
          className={`flex flex-col ${
            hasMedia ? "w-full md:w-[420px] border-l" : "w-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4">
            {/* the user of the post */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                postInfo.profilePic
                  ? postInfo.profilePic
                  : "/default_profile.jpg"
              }
              className="w-10 h-10 rounded-full"
              alt=""
            />
            <div>
              <div className="font-semibold text-sm text-gray-900">
                {postInfo.username}
              </div>
              <div className="text-xs text-gray-900">
                {parseDate(postInfo.createdAt || "")}
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-auto text-gray-900 hover:text-gray-500 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <PostContentSection title={title} content={content} />

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial loading */}
            {isLoading && (
              <div className="text-sm text-gray-500">Loading comments...</div>
            )}

            {/* Error */}
            {isError && (
              <div className="text-sm text-red-500">
                Failed to load comments
              </div>
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
                {isFetchingNextPage ? "Loading more..." : comments.length > 15 && "Load more comments"}
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
        </div>
      </div>

      {/* Slide animations */}
      <style jsx>{`
        @keyframes slideLeft {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-left {
          animation: slideLeft 0.3s ease-out;
        }

        .animate-slide-right {
          animation: slideRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
