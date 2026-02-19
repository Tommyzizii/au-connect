// ConversationsPane.tsx
"use client";

import { Search, MailPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InboxRowItem from "./InboxRowItem";
import type { InboxRow } from "@/types/InboxRow";
import NewMessageModal from "./NewMessageModal";

export default function ConversationsPane({
  inbox,
  selectedUserId,
  showChatMobile,
  onOpen,
  getRowPreview,
}: {
  inbox: InboxRow[];
  selectedUserId: string | null;
  showChatMobile: boolean;
  onOpen: (row: InboxRow) => void;
  getRowPreview: (row: InboxRow) => {
    text: string | null;
    time: string | null;
    isFailed: boolean;
  };
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [openNewMessage, setOpenNewMessage] = useState(false);

  const filteredInbox = useMemo(() => {
    const q = query.replace(/\s+/g, "").toLowerCase();
    if (!q) return inbox;

    return inbox.filter((row) =>
      row.user.username.replace(/\s+/g, "").toLowerCase().includes(q),
    );
  }, [inbox, query]);

  return (
    <div
      className={[
        "col-span-12 md:col-span-5 lg:col-span-4",
        "bg-white border rounded-lg overflow-hidden",
        "flex flex-col min-h-0",
        showChatMobile ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      {/* header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus-within:border-gray-400">
            <Search className="text-gray-400 w-5 h-5 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Contacts..."
              className="ml-3 text-sm text-gray-600 placeholder-gray-400 w-full border-none focus:outline-none bg-transparent"
            />
          </div>

          {/* clickable new message (top right) */}
          <button
            type="button"
            className="shrink-0 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
            aria-label="New message"
            onClick={() => setOpenNewMessage(true)}
          >
            <MailPlus className="text-gray-600 w-6 h-6" />
          </button>
        </div>

        {query.trim() && (
          <div className="mt-2 text-xs text-gray-500">
            Showing {filteredInbox.length} result(s)
          </div>
        )}
      </div>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {inbox.length === 0 ? (
          <div className="p-6">
            <div className="flex items-start gap-3">
              {/* not clickable icon */}
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <MailPlus className="w-5 h-5 text-gray-500" />
              </div>

              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900 mb-1">
                  No conversations yet
                </div>
                <div className="text-gray-500">
                  Click the icon above to start chatting.
                </div>
              </div>
            </div>
          </div>
        ) : filteredInbox.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No matching conversations.</div>
        ) : (
          filteredInbox.map((row) => {
            const preview = getRowPreview(row);

            return (
              <InboxRowItem
                key={row.conversationId ?? `user-${row.user.id}`}
                row={row}
                isSelected={row.user.id === selectedUserId}
                onOpen={() => onOpen(row)}
                previewText={preview.text}
                previewTime={preview.time}
                previewFailed={preview.isFailed}
              />
            );
          })
        )}
      </div>

      <NewMessageModal
        open={openNewMessage}
        onClose={() => setOpenNewMessage(false)}
        onPickUser={(u) => {
          router.push(`/messages?userId=${u.id}`);
          setOpenNewMessage(false);
        }}
      />
    </div>
  );
}
