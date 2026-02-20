"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { ChatMessage } from "@/types/ChatMessage";
import { formatSmartStamp, formatFullDateTime } from "../util/messagingUtils";

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
    "px-4 py-2.5 rounded-3xl",
    isIncoming ? "bg-gray-200 text-gray-800" : "bg-red-500 text-white",
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
                "cursor-pointer",
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
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(false);
                        onDeleteLocal?.(m.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
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
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
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
          <p className="text-sm break-words">{m.text}</p>
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
