"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/client/notifications.client";

import { timeAgo } from "@/lib/timeAgo";
import { buildSlug } from "@/app/profile/utils/buildSlug";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";

type NotificationType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "COMMENT_REPLIED"
  | "POST_SHARED"
  | "POST_VOTED";

type Notification = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  entityId?: string;
  fromUser?: {
    id: string;
    username: string;
    profilePic?: string;
  };
};

const notificationMessages: Record<NotificationType, string> = {
  CONNECTION_REQUEST: "sent you a connection request",
  CONNECTION_ACCEPTED: "accepted your connection request",
  POST_LIKED: "liked your post",
  POST_COMMENTED: "commented on your post",
  COMMENT_REPLIED: "replied to your comment",
  POST_SHARED: "shared your post",
  POST_VOTED: "voted on your poll",
};

function NotificationAvatar({
  profilePic,
  username,
}: {
  profilePic?: string;
  username?: string;
}) {
  const avatarUrl = useResolvedMediaUrl(profilePic, "/default_profile.jpg");

  return (
    <Image
      src={avatarUrl}
      alt={username || "User"}
      fill
      className="object-cover"
    />
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n,
        ),
      );
    }

    if (
      notification.type === "CONNECTION_REQUEST" ||
      notification.type === "CONNECTION_ACCEPTED"
    ) {
      if (notification.fromUser?.id) {
        const slug = buildSlug(
          notification.fromUser.username || "",
          notification.fromUser.id,
        );
        router.push(`/profile/${slug}`);
      }
      return;
    }

    if (notification.entityId) {
      router.push(`/posts/${notification.entityId}`);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="h-full overflow-y-auto flex flex-col items-center pt-6 px-4">
        <section className="w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2">

          {/* HEADER */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-neutral-800">
              Notifications
            </h2>

            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}

            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await markAllNotificationsRead();
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true })),
                  );
                }}
                className="ml-auto text-sm text-blue-600 hover:underline font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* LOADING */}
          {loading && (
            <p className="text-neutral-500 text-sm">Loading notifications...</p>
          )}

          {/* EMPTY STATE */}
          {!loading && notifications.length === 0 && (
            <div className="py-20 text-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                No notifications yet
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                When someone interacts with you, notifications will appear here.
              </p>
            </div>
          )}

          {/* LIST */}
          <div className="space-y-4">
            {notifications.map((notification) => {
              const fromUser = notification.fromUser;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`group relative overflow-hidden rounded-2xl p-6 border cursor-pointer
                    hover:shadow-xl hover:scale-[1.02] transition-all duration-300
                    ${
                      notification.isRead
                        ? "bg-linear-to-br from-neutral-50 to-neutral-100/50 border-neutral-200/50"
                        : "bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200/50"
                    }`}
                >
                  <div className="flex items-center gap-4">

                    {/* AVATAR */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`relative h-14 w-14 rounded-2xl overflow-hidden ring-2 transition-all
                          ${
                            notification.isRead
                              ? "ring-neutral-200 group-hover:ring-blue-400"
                              : "ring-blue-300 group-hover:ring-blue-500"
                          }`}
                      >
                        <NotificationAvatar
                          profilePic={fromUser?.profilePic}
                          username={fromUser?.username}
                        />
                      </div>

                      {!notification.isRead && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* TEXT */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-neutral-900">
                        <span className="font-bold">
                          {fromUser?.username || "Someone"}
                        </span>{" "}
                        {notificationMessages[notification.type]}
                      </p>

                      <span className="text-xs text-neutral-500 block">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </section>
      </div>
    </main>
  );
}