"use client";

import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import { formatTime } from "../util/messagingUtils";
import type { InboxRow } from "@/types/InboxRow";

export default function InboxRowItem({
  row,
  isSelected,
  onOpen,
}: {
  row: InboxRow;
  isSelected: boolean;
  onOpen: () => void;
}) {
  const avatarUrl = useResolvedMediaUrl(row.user.profilePic, "/default_profile.jpg");
  const unread = (row.unreadCount ?? 0) > 0;

  // Visual priority:
  // - Selected: gray bg
  // - Unread: red left bar + slightly tinted bg + bolder text
  const baseBg = isSelected ? "bg-gray-100" : unread ? "bg-red-50/60" : "bg-white";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "w-full text-left flex items-center gap-3 px-4 py-3 transition-colors",
        "hover:bg-gray-50",
        "relative",
        baseBg,
      ].join(" ")}
    >
      {/* unread indicator bar */}
      {unread && !isSelected && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-red-500" />
      )}

      <div className="relative w-11 h-11 shrink-0">
        <Image
          src={avatarUrl}
          alt={row.user.username}
          fill
          className="rounded-full object-cover"
        />

        {/* small unread dot on avatar */}
        {unread && (
          <span className="absolute -right-0.5 -top-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3
            className={[
              "text-sm truncate",
              unread ? "font-extrabold text-gray-900" : "font-semibold text-gray-900",
            ].join(" ")}
          >
            {row.user.username}
          </h3>

          <span className={["text-xs shrink-0 ml-2", unread ? "text-gray-700" : "text-gray-500"].join(" ")}>
            {formatTime(row.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={[
              "text-sm truncate mt-0.5",
              unread ? "text-gray-900 font-semibold" : "text-gray-600",
            ].join(" ")}
          >
            {row.lastMessageText || "No messages yet"}
          </p>

          {unread && (
            <span className="shrink-0 text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold">
              {row.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
