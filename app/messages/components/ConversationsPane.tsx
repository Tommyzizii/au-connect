"use client";

import { Search, SquarePen, Users } from "lucide-react";
import InboxRowItem from "./InboxRowItem";
import type { InboxRow } from "@/types/InboxRow";

export default function ConversationsPane({
  inbox,
  selectedUserId,
  showChatMobile,
  onOpen,
}: {
  inbox: InboxRow[];
  selectedUserId: string | null;
  showChatMobile: boolean;
  onOpen: (row: InboxRow) => void;
}) {
  return (
    <div
      className={[
        "col-span-12 md:col-span-5 lg:col-span-4",
        "bg-white border rounded-lg overflow-hidden",
        "flex flex-col min-h-0",
        showChatMobile ? "hidden md:flex" : "flex",
      ].join(" ")}
    >
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus-within:border-gray-400">
            <Search className="text-gray-400 w-5 h-5 shrink-0" />
            <input
              type="text"
              placeholder="Search contacts"
              className="ml-3 text-sm text-gray-600 placeholder-gray-400 w-full border-none focus:outline-none bg-transparent"
            />
          </div>

          <SquarePen className="text-gray-500 w-5 h-5 shrink-0 cursor-pointer hover:text-gray-700" />
          <Users className="text-gray-500 w-5 h-5 shrink-0 cursor-pointer hover:text-gray-700" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {inbox.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No conversations.</div>
        ) : (
          inbox.map((row) => (
            <InboxRowItem
              key={row.conversationId ?? `user-${row.user.id}`}
              row={row}
              isSelected={row.user.id === selectedUserId}
              onOpen={() => onOpen(row)}
            />
          ))
        )}
      </div>
    </div>
  );
}
