"use client";

import type { ChatMessage } from "@/types/ChatMessage";
import { formatTime } from "../util/messagingUtils";

export default function MessageBubble({
  m,
  isIncoming,
  onRetry,
  onDeleteLocal,
}: {
  m: ChatMessage;
  isIncoming: boolean;
  onRetry?: (id: string) => void;
  onDeleteLocal?: (id: string) => void;
}) {
  const isSending = m.status === "sending";
  const isFailed = m.status === "failed";

  // Actions only for outgoing failed messages
  const canActions = !isIncoming && isFailed;

  const bubbleClass = [
    "px-4 py-2.5 md:px-5 md:py-3 rounded-3xl transition-opacity",
    isIncoming ? "bg-gray-200 text-gray-800" : "bg-red-500 text-white",
    isSending ? "opacity-60" : "",
    isFailed ? "opacity-80" : "",
  ].join(" ");

  const statusText =
    isIncoming ? null : isFailed ? "Failed" : isSending ? "Sending…" : null;

  return (
    <div className={`px-4 md:px-6 py-2 flex ${isIncoming ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[75%] md:max-w-md">
        <div className={bubbleClass}>
          <p className="text-sm break-words">{m.text}</p>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2">
          {statusText && (
            <span className={`text-xs ${isFailed ? "text-red-500" : "text-gray-400"}`}>
              {statusText}
            </span>
          )}
          <p className="text-xs text-gray-400">{formatTime(m.createdAt)}</p>
        </div>

        {canActions && (
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onRetry?.(m.id)}
              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
            >
              Retry
            </button>

            <button
              type="button"
              onClick={() => onDeleteLocal?.(m.id)}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              title="Delete locally (not sent)"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
