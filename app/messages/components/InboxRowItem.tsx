"use client";

import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { formatSmartStamp, formatFullDateTime } from "../util/messagingUtils";
import type { InboxRow } from "@/types/InboxRow";

export default function InboxRowItem({
  row,
  isSelected,
  onOpen,
  previewText,
  previewTime,
  previewFailed,
}: {
  row: InboxRow;
  isSelected: boolean;
  onOpen: () => void;

  // overrides (from client state)
  previewText: string | null;
  previewTime: string | null;
  previewFailed: boolean;
}) {
  const avatarUrl = useResolvedMediaUrl(row.user.profilePic, "/default_profile.jpg");
  const unread = (row.unreadCount ?? 0) > 0;

  const baseBg = isSelected ? "bg-gray-100" : unread ? "bg-red-50/60" : "bg-white";

  const displayText = previewText ?? row.lastMessageText ?? "No messages yet";
  const displayTime = previewTime ?? row.lastMessageAt ?? null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "w-full text-left flex items-center gap-3 px-4 py-3 transition-colors",
        "hover:bg-gray-50",
        "relative",
        "cursor-pointer",
        baseBg,
      ].join(" ")}
    >
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

          {/* ✅ Smart stamp + hover full */}
          <span
            className={[
              "text-xs shrink-0 ml-2 cursor-default",
              previewFailed ? "text-red-600" : unread ? "text-gray-700" : "text-gray-500",
            ].join(" ")}
            title={formatFullDateTime(displayTime)}
          >
            {formatSmartStamp(displayTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={[
              "text-sm truncate mt-0.5",
              previewFailed
                ? "text-red-600 font-semibold"
                : unread
                  ? "text-gray-900 font-semibold"
                  : "text-gray-600",
            ].join(" ")}
          >
            {displayText}
          </p>

          {unread ? (
            <span className="shrink-0 text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-semibold">
              {row.unreadCount}
            </span>
          ) : previewFailed ? (
            <span className="shrink-0 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold">
              Failed
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
