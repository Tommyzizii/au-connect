import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";

import CommentInput from "./CommentInput";
import parseDate from "../(main)/profile/utils/parseDate";
import { useReplies } from "../(main)/profile/utils/fetchfunctions";
import CommentType from "@/types/CommentType";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

export default function CommentItem({
  comment,
  postId,
  createCommentMutation,
  depth = 0,
}: {
  comment: CommentType;
  postId: string;
  createCommentMutation: UseMutationResult<
    CommentType,
    Error,
    {
      postId: string;
      content: string;
      parentCommentId?: string;
    },
    unknown
  >;
  depth?: number;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const avatarUrl = useResolvedMediaUrl(
    comment.profilePic,
    DEFAULT_PROFILE_PIC,
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReplies(postId, comment.id, isOpen);

  const replies = data?.pages.flatMap((page) => page.replies) ?? [];

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          className="w-8 h-8 rounded-full object-cover"
          alt=""
        />

        <div className="text-sm text-gray-900">
          <span className="font-semibold mr-1">{comment.username}</span>
          {comment.content}

          <div className="flex gap-3 text-xs text-gray-500 mt-1">
            <span>{parseDate(comment.createdAt)}</span>

            {comment.replyCount && comment.replyCount > 0 && (
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="hover:text-blue-500"
              >
                {isOpen
                  ? "Hide replies"
                  : `View replies (${comment.replyCount})`}
              </button>
            )}

            <button
              onClick={() => setIsReplying((v) => !v)}
              className="hover:text-blue-500"
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-2 ml-11">
          <CommentInput
            placeholder={`Reply to ${comment.username}...`}
            onSubmit={(text) => {
              createCommentMutation.mutate({
                postId,
                content: text,
                parentCommentId: comment.id,
              });
              setIsReplying(false);
              setIsOpen(true); // 🔥 auto-open replies after replying
            }}
          />
        </div>
      )}

      {/* Replies */}
      {isOpen && (
        <div className="mt-2 ml-11 space-y-3">
          {isLoading && (
            <div className="text-xs text-gray-500">Loading replies…</div>
          )}

          {isError && (
            <div className="text-xs text-red-500">Failed to load replies</div>
          )}

          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              createCommentMutation={createCommentMutation}
              depth={depth + 1}
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-blue-500 hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage
                ? "Loading…"
                : replies.length > 5 && "Load more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
