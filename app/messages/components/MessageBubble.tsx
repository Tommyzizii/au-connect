"use client";

import type { ChatMessage } from "@/types/ChatMessage";
import { formatTime } from "../util/messagingUtils";

export default function MessageBubble({
  m,
  isIncoming,
}: {
  m: ChatMessage;
  isIncoming: boolean;
}) {
  return (
    <div className={`px-4 md:px-6 py-2 flex ${isIncoming ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[75%] md:max-w-md">
        <div
          className={`px-4 py-2.5 md:px-5 md:py-3 rounded-3xl ${
            isIncoming ? "bg-gray-200 text-gray-800" : "bg-red-500 text-white"
          }`}
        >
          <p className="text-sm break-words">{m.text}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{formatTime(m.createdAt)}</p>
      </div>
    </div>
  );
}
