"use client";

import Image from "next/image";
import {
  Send,
  ImagePlus,
  Paperclip,
  Smile,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "@/types/ChatMessage";
import { useEffect, useRef } from "react";

export default function ChatPane({
  showChatMobile,
  onBackMobile,
  selectedName,
  selectedProfilePic,
  selectedUserId,
  selectedConversationId,
  messages,
  messageInput,
  setMessageInput,
  onSend,
  isAtBottomRef,
}: {
  showChatMobile: boolean;
  onBackMobile: () => void;
  selectedName: string;
  selectedProfilePic: string | null;
  selectedUserId: string | null;
  selectedConversationId: string | null;
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (v: string) => void;
  onSend: () => void;
  isAtBottomRef: React.MutableRefObject<boolean>;
}) {
  const selectedAvatarUrl = useResolvedMediaUrl(
    selectedProfilePic,
    "/default_profile.jpg"
  );

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Track which conversation we last scrolled for
  const lastConvRef = useRef<string | null>(null);
  const didInitialScrollRef = useRef(false);

  // 1) When switching conversation: reset initial-scroll flag
  useEffect(() => {
    if (selectedConversationId !== lastConvRef.current) {
      lastConvRef.current = selectedConversationId;
      didInitialScrollRef.current = false;
    }
  }, [selectedConversationId]);

  // 2) Scroll to bottom once when messages for that conversation first arrive
  useEffect(() => {
    if (!selectedConversationId) return;
    if (!messages.length) return;

    if (!didInitialScrollRef.current) {
      didInitialScrollRef.current = true;

      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: "LAST",
          behavior: "auto",
          align: "end",
        });
      });
    }
  }, [selectedConversationId, messages.length]);

  //  3) Follow new messages only if user is already at bottom
  useEffect(() => {
    if (!selectedConversationId) return;
    if (!messages.length) return;

    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: "LAST",
          behavior: "smooth",
          align: "end",
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  return (
    <div
      className={[
        "col-span-12 md:col-span-7 lg:col-span-8",
        "bg-white border rounded-lg overflow-hidden",
        "flex flex-col min-h-0",
        showChatMobile ? "flex" : "hidden md:flex",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b shrink-0">
        <div className="flex items-center min-w-0 flex-1">
          <ArrowLeft
            onClick={onBackMobile}
            className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900 mr-3 flex-shrink-0 md:hidden"
          />
          <div className="relative w-11 h-11 shrink-0">
            <Image
              src={selectedAvatarUrl}
              alt={selectedName}
              fill
              className="rounded-full object-cover"
            />
          </div>
          <h2 className="ml-3 font-semibold text-gray-900 text-base md:text-lg truncate">
            {selectedName}
          </h2>
        </div>
        <MoreVertical className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 shrink-0 ml-2" />
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        {!selectedConversationId ? (
          <div className="p-6 text-sm text-gray-500">Select a conversation.</div>
        ) : messages.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No messages yet.</div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            alignToBottom
            initialTopMostItemIndex={Math.max(messages.length - 1, 0)}
            atBottomStateChange={(atBottom) => {
              isAtBottomRef.current = atBottom;
            }}
            itemContent={(_, m) => (
              <MessageBubble m={m} isIncoming={m.senderId === selectedUserId} />
            )}
          />
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 md:px-6 border-t shrink-0">
        <div className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-2 md:px-5 md:py-3 gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 border-none focus:outline-none bg-transparent min-w-0"
            onKeyDown={(e) => e.key === "Enter" && onSend()}
          />

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <ImagePlus className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" />
            <Paperclip className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 hidden sm:block" />
            <Smile className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700 hidden sm:block" />
            <button className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 hidden sm:block">
              GIF
            </button>
            <Send
              onClick={onSend}
              className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
