"use client";

import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import CommentInput from "./CommentInput";
import parseDate from "../(main)/profile/utils/parseDate";
import { useReplies } from "../(main)/profile/utils/fetchfunctions";
import CommentType from "@/types/CommentType";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

// depth 0 = top-level comment
// depth 1 = reply
//
// Replying at depth 1 still posts against the top-level comment id (flat),
// but prepends @username so it's clear who's being addressed.

export default function CommentItem({
  comment,
  postId,
  createCommentMutation,
  depth = 0,
  // The id of the top-level comment that owns this reply thread.
  // Passed down so depth-1 replies can still post against it (keeping things flat).
  topLevelCommentId,
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
  topLevelCommentId?: string;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const avatarUrl = useResolvedMediaUrl(comment.profilePic, DEFAULT_PROFILE_PIC);

  const hasReplies = (comment.replyCount ?? 0) > 0;

  // For depth-1 replies: post goes to the top-level comment, not this reply.
  // For depth-0 comments: post goes to this comment directly.
  const replyTargetId = depth === 0 ? comment.id : topLevelCommentId;

  // At depth 1 we @mention the person being replied to so context isn't lost.
  // Format: @[username] — brackets handle usernames with spaces cleanly.
  const replyPrefix = depth === 1 ? `@[${comment.username}] ` : "";

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReplies(postId, comment.id, isOpen);

  // Deduplicate — prevents doubles when optimistic update collides with server data
  const replies =
    data?.pages
      .flatMap((page) => page.replies)
      .filter(
        (reply, index, self) =>
          index === self.findIndex((r) => r.id === reply.id),
      ) ?? [];

  return (
    <div style={{ marginLeft: depth * 16 }}>
      {/* Comment row */}
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          alt=""
        />

        <div className="text-sm text-gray-900 flex-1 min-w-0">
          {/* Parse @[username] mentions for depth-1 replies */}
          {depth === 1 && /^@\[.+\] /.test(comment.content) ? (
            (() => {
              const closingBracket = comment.content.indexOf("]");
              const mentionedName = comment.content.slice(2, closingBracket); // strip @[ and ]
              const rest = comment.content.slice(closingBracket + 2); // skip "] "
              return (
                <>
                  <span className="font-semibold mr-1">{comment.username}</span>
                  <span className="text-blue-500 font-medium">
                    @{mentionedName}
                  </span>
                  <span className="text-gray-400 mx-1">-</span>
                  <span className="break-words">{rest}</span>
                </>
              );
            })()
          ) : (
            <>
              <span className="font-semibold mr-1">{comment.username}</span>
              <span className="break-words">{comment.content}</span>
            </>
          )}

          {/* Action row */}
          <div className="flex gap-3 text-xs text-gray-500 mt-1">
            <span>{parseDate(comment.createdAt)}</span>

            {/* View replies — only on depth 0, only when replies exist */}
            {depth === 0 && hasReplies && (
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="hover:text-blue-500 transition-colors"
              >
                {isOpen
                  ? "Hide replies"
                  : `View replies (${comment.replyCount})`}
              </button>
            )}

            {/* Reply button — always shown, but behaviour differs by depth */}
            <button
              onClick={() => setIsReplying((v) => !v)}
              className="hover:text-blue-500 transition-colors"
            >
              {isReplying ? "Cancel" : "Reply"}
            </button>
          </div>
        </div>
      </div>

      {/* Reply composer */}
      {isReplying && (
        <div className="mt-2 ml-11">
          <CommentInput
            isLoading={createCommentMutation.isPending}
            placeholder={`Reply to ${comment.username}...`}
            onSubmit={(text) => {
              createCommentMutation.mutate({
                postId,
                // Flatten: always post against the top-level comment
                parentCommentId: replyTargetId,
                // Prepend @mention when replying to a reply
                content: replyPrefix + text,
              });
              setIsReplying(false);
              // If we're at depth 0, open the replies panel so user sees it land.
              // If at depth 1 the replies panel is already visible (we're inside it).
              if (depth === 0) setIsOpen(true);
            }}
          />
        </div>
      )}

      {/* Replies list — only rendered at depth 0 */}
      {depth === 0 && isOpen && (
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
              depth={1}
              topLevelCommentId={comment.id} // pass down so depth-1 can post flat
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-blue-500 hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading…" : "Load more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}