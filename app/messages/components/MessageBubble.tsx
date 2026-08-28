"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageIcon, MoreVertical } from "lucide-react";
import type { ChatMessage } from "@/types/ChatMessage";
import { formatSmartStamp, formatFullDateTime } from "../util/messagingUtils";
import Link from "next/link";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

export default function MessageBubble({
  m,
  isIncoming,
  onRetry,
  onDeleteLocal,
  onDeleteForEveryone,
}: {
  m: ChatMessage;
  isIncoming: boolean;
  onRetry?: (id: string) => void;
  onDeleteLocal?: (id: string) => void;
  onDeleteForEveryone?: (id: string) => void;
}) {
  const isSending = m.status === "sending";
  const isFailed = m.status === "failed";
  const isSharedPostMessage = m.kind === "SHARED_POST";
  const sharedPostAvatar = useResolvedMediaUrl(
    m.sharedPost?.actorType === "COMMUNITY"
      ? m.sharedPost.community?.profilePic
      : m.sharedPost?.profilePic,
    "/default_profile.jpg",
  );

  // Only show menu for outgoing + not sending
  const canOpenMenu = !isIncoming && !isSending;

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu when clicking outside / pressing ESC
  useEffect(() => {
    if (!openMenu) return;

    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const bubbleClass = [
    isSharedPostMessage ? "rounded-2xl" : "px-4 py-2.5 rounded-3xl",
    isSharedPostMessage
      ? "bg-transparent text-gray-900"
      : isIncoming
        ? "bg-gray-200 text-gray-800"
        : "bg-red-500 text-white",
    isSending ? "opacity-60" : "",
    isFailed ? "opacity-80" : "",
  ].join(" ");

  const statusText = isIncoming
    ? null
    : isFailed
    ? "Failed"
    : isSending
    ? "Sending…"
    : null;

  return (
    <div className={`px-4 py-2 flex ${isIncoming ? "justify-start" : "justify-end"}`}>
      {/* IMPORTANT: relative container, no negative right offsets => no horizontal scroll */}
      <div className="max-w-[75%] relative group">
        {/* 3-dot trigger (INSIDE the message area) */}
        {canOpenMenu && (
          <div ref={menuRef} className="absolute right-0 -top-2 z-20">
            <button
              type="button"
              aria-label="Message actions"
              onClick={() => setOpenMenu((v) => !v)}
              className={[
                "p-1.5 rounded-full",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "hover:bg-gray-100",
                "",
                openMenu ? "opacity-100 bg-gray-100" : "",
              ].join(" ")}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown appears ABOVE the bubble (top of message), smaller */}
            {openMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-40 bg-white border rounded-lg shadow-md overflow-hidden">
                {isFailed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(false);
                        onRetry?.(m.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 "
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(false);
                        onDeleteLocal?.(m.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 "
                    >
                      Unsend
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      onDeleteForEveryone?.(m.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 "
                  >
                    Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className={bubbleClass}>
          {m.text && <p className="text-sm break-words">{m.text}</p>}
          {isSharedPostMessage && !m.sharedPost && (
            <div className="min-w-56 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
              This post is no longer available.
            </div>
          )}
          {m.sharedPost && (
            <Link
              href={`/posts/${m.sharedPost.id}`}
              className={`group/card block min-w-64 max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md ${m.text ? "mt-2" : ""}`}
            >
              <div className="h-1 bg-red-500" />
              <div className="flex items-center gap-2.5 px-4 pb-3 pt-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sharedPostAvatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-100" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {m.sharedPost.actorType === "COMMUNITY"
                      ? m.sharedPost.community?.name
                      : m.sharedPost.username}
                  </p>
                  <p className="text-xs text-gray-500">Post on AU Connect</p>
                </div>
                <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover/card:text-red-500" />
              </div>
              <div className="border-t border-gray-100 px-4 py-3.5">
                {m.sharedPost.title && <p className="mb-1 text-sm font-semibold">{m.sharedPost.title}</p>}
                <p className="line-clamp-3 text-sm leading-5 text-gray-600">{m.sharedPost.content}</p>
                {m.sharedPost.mediaTypes.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Media attached
                  </div>
                )}
              </div>
            </Link>
          )}
        </div>

        {/* Meta */}
        <div className="mt-1 flex items-center justify-end gap-2">
          {statusText && (
            <span className={`text-xs ${isFailed ? "text-red-500" : "text-gray-400"}`}>
              {statusText}
            </span>
          )}

          <p className="text-xs text-gray-400 cursor-default" title={formatFullDateTime(m.createdAt)}>
            {formatSmartStamp(m.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
