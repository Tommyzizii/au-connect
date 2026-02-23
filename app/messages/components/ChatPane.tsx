"use client";

import Image from "next/image";
import {
  Send,
  MoreVertical,
  ArrowLeft,
  MailPlus,
} from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "@/types/ChatMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDayLabel } from "../util/messagingUtils";
import { useRouter } from "next/navigation";

type TimelineItem =
  | { kind: "sep"; key: string; label: string }
  | { kind: "msg"; key: string; m: ChatMessage };

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; // local day bucket
}

export default function ChatPane({
  showChatMobile,
  onBackMobile,
  selectedName,
  selectedProfilePic,
  selectedUserId,
  selectedConversationId,
  selectedUnreadCount,
  messages,
  messageInput,
  setMessageInput,
  onSend,
  isAtBottomRef,
  onLoadOlder,
  hasMoreOlder,
  loadingOlder,
  onRetryMessage,
  onDeleteLocalMessage,
  onDeleteForEveryone,
  onClearConversation,
}: {
  showChatMobile: boolean;
  onBackMobile: () => void;
  selectedName: string;
  selectedProfilePic: string | null;
  selectedUserId: string | null; // the OTHER user
  selectedConversationId: string | null;
  selectedUnreadCount: number;
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (v: string) => void;
  onSend: () => void;
  isAtBottomRef: React.MutableRefObject<boolean>;
  onLoadOlder: () => void;
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  onRetryMessage: (messageId: string) => void;
  onDeleteLocalMessage: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
  onClearConversation: () => void;
}) {
  const router = useRouter();
  const hasSelection = !!selectedUserId;
  const selectedAvatarUrl = useResolvedMediaUrl(
    selectedProfilePic,
    "/default_profile.jpg"
  );

  const [openMenu, setOpenMenu] = useState(false);

  // ✅ OPTIONAL logic only: close menu when click outside (no UI changes)
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenu) return;

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);


  const timeline = useMemo<TimelineItem[]>(() => {
    if (!messages.length) return [];

    const out: TimelineItem[] = [];
    let lastDay: string | null = null;

    for (const m of messages) {
      const dk = dayKey(m.createdAt);
      if (dk !== lastDay) {
        out.push({
          kind: "sep",
          key: `sep-${dk}`,
          label: formatDayLabel(m.createdAt),
        });
        lastDay = dk;
      }
      out.push({ kind: "msg", key: m.id, m });
    }

    return out;
  }, [messages]);
  const lastTimelineIndex = timeline.length > 0 ? timeline.length - 1 : 0;
  const initialTimelineIndex = useMemo(() => {
    if (!timeline.length) return 0;
    if (!selectedUserId || selectedUnreadCount <= 0) return lastTimelineIndex;

    const incomingMsgIndexes = timeline
      .map((item, index) =>
        item.kind === "msg" && item.m.senderId === selectedUserId ? index : -1,
      )
      .filter((index) => index >= 0);

    if (!incomingMsgIndexes.length) return lastTimelineIndex;

    // unread messages are the latest incoming ones (based on unreadCount snapshot at open time)
    const unreadIncoming = incomingMsgIndexes.slice(-selectedUnreadCount);
    if (!unreadIncoming.length) return lastTimelineIndex;

    // latest unread incoming message
    return unreadIncoming[unreadIncoming.length - 1];
  }, [timeline, selectedUserId, selectedUnreadCount, lastTimelineIndex]);

  return (
    <div
      className={[
        "col-span-12 md:col-span-7 lg:col-span-8",
        "bg-white flex flex-col min-h-0 h-full",
        // ✅ mobile: full screen (no card)
        "rounded-none border-0",
        // ✅ desktop: card look
        "md:border md:rounded-lg md:overflow-hidden",
        showChatMobile ? "flex" : "hidden md:flex",
      ].join(" ")}
    >
      {!hasSelection ? (
        <div className="flex-1 min-h-0 bg-gray-50 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white border rounded-2xl shadow-sm p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <MailPlus className="w-7 h-7 text-gray-500" />
            </div>

            <div className="mt-4 text-lg font-semibold text-gray-900">
              Your messages
            </div>

            <div className="mt-2 text-sm text-gray-500 leading-relaxed">
              Select a conversation on the left, or click the{" "}
              <span className="font-medium text-gray-700">Mail+</span> icon to
              start a new chat.
            </div>

            <div className="mt-5 text-xs text-gray-400">
              Tip: You can also click{" "}
              <span className="font-medium">Message</span> on someone’s profile.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b shrink-0 bg-white">
            <div className="flex items-center min-w-0 flex-1">
              <ArrowLeft
                onClick={onBackMobile}
                className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900 mr-3 flex-shrink-0 md:hidden"
              />

              <button
                type="button"
                onClick={() => {
                  if (!selectedUserId) return;
                  const slug = buildSlug(selectedName || "", selectedUserId);
                  router.push(`/profile/${slug}`);
                }}
                className="flex items-center min-w-0 cursor-pointer"
                aria-label={`Open ${selectedName} profile`}
              >
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
              </button>
            </div>

            {/* ✅ only logic changes here */}
            <div className="relative" ref={menuRef}>
              <MoreVertical
                className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => setOpenMenu((v) => !v)}
              />

              {openMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    onClick={() => {
                      onClearConversation();
                      setOpenMenu(false);
                    }}
                  >
                    Clear chat
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 bg-gray-50 pb-24 md:pb-0">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border rounded-xl p-6 text-center shadow-sm">
                  <div className="text-sm text-gray-500">
                    Say hi to{" "}
                    <span className="font-medium text-gray-900">
                      {selectedName}
                    </span>{" "}
                    👋
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    Your messages are private between you two.
                  </div>
                </div>
              </div>
            ) : (
              <Virtuoso
                key={selectedConversationId ?? "no-conversation"}
                ref={virtuosoRef}
                data={timeline}
                initialTopMostItemIndex={initialTimelineIndex}
                followOutput={(atBottom) => (atBottom ? "smooth" : false)}
                atBottomStateChange={(atBottom) => {
                  isAtBottomRef.current = atBottom;
                }}
                startReached={() => {
                  if (!loadingOlder && hasMoreOlder) onLoadOlder();
                }}
                itemContent={(_, item) => {
                  if (item.kind === "sep") {
                    return (
                      <div className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-gray-200" />
                          <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
                            {item.label}
                          </div>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                      </div>
                    );
                  }

                  const m = item.m;
                  return (
                    <MessageBubble
                      m={m}
                      isIncoming={
                        !!selectedUserId && m.senderId === selectedUserId
                      }
                      onRetry={onRetryMessage}
                      onDeleteLocal={onDeleteLocalMessage}
                      onDeleteForEveryone={onDeleteForEveryone} // ✅ PASS DOWN
                    />
                  );
                }}
              />
            )}
          </div>

          {/* Input */}
          <div
            className="border-t bg-white z-10
             fixed inset-x-0 bottom-0 px-4 pt-3
             md:static md:px-6 md:pt-3"
            style={{
              paddingBottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 0.25rem)",
            }}
          >
            <div className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-2 md:px-5 md:py-3 gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-base md:text-sm text-gray-700 placeholder-gray-400 border-none focus:outline-none bg-transparent min-w-0"
                onKeyDown={(e) => e.key === "Enter" && onSend()}
              />

              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={onSend}
                  aria-label="Send"
                  className="cursor-pointer"
                >
                  <Send className="w-5 h-5 text-gray-700 cursor-pointer hover:text-gray-900" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
