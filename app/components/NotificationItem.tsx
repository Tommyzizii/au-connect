"use client";

import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/timeAgo";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";

export default function NotificationItem({ n }: { n: any }) {
  const fromUser = n.fromUser;

  const avatarUrl = useResolvedMediaUrl(
    fromUser?.profilePic,
    "/default_profile.jpg",
  );

  return (
    <Link
      href={`/profile/${fromUser?.id}`}
      className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 ${
        !n.isRead ? "bg-blue-50" : ""
      }`}
    >
      <Image
        src={avatarUrl}
        alt={fromUser?.username || "User"}
        width={40}
        height={40}
        className="rounded-full object-cover"
      />

      <div className="flex-1">
        <p className="text-sm font-medium">
          {fromUser?.username || "Unknown user"}
        </p>

        <p className="text-sm text-gray-600">
          {n.type === "CONNECTION_REQUEST" && "sent you a connection request"}
          {n.type === "CONNECTION_ACCEPTED" &&
            "accepted your connection request"}
        </p>
      </div>

      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
    </Link>
  );
}
