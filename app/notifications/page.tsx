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
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { SINGLE_POST_API_PATH } from "@/lib/constants";

type NotificationType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "COMMENT_REPLIED"
  | "POST_SHARED"
  | "POST_VOTED"
  | "JOB_APPLICATION";

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
  JOB_APPLICATION: "applied to your job post",
};
const NAVIGATION_ERROR_TIMEOUT_MS = 5000;

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
  const [navigationError, setNavigationError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!navigationError) return;

    const timer = window.setTimeout(() => {
      setNavigationError(null);
    }, NAVIGATION_ERROR_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [navigationError]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = async (notification: Notification) => {
    setNavigationError(null);

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
      try {
        const res = await fetch(SINGLE_POST_API_PATH(notification.entityId), {
          cache: "no-store",
          credentials: "include",
        });

        if (res.status === 404) {
          setNavigationError(
            "This post was deleted, so this notification can no longer be opened.",
          );
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to open notification target");
        }

        router.push(`/posts/${notification.entityId}?media=0`);
      } catch (error) {
        console.error("Failed to open notification target:", error);
        setNavigationError("Unable to open this notification right now.");
      }
    }

  };

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-6 h-full overflow-y-auto">
        <section className="w-full">

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
                className="cursor-pointer ml-auto text-sm text-blue-600 hover:underline font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>

          {navigationError && (
            <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50 via-orange-50 to-amber-100/60 shadow-sm">
              <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                  !
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    Post unavailable
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {navigationError}
                  </p>
                </div>
              </div>
              <div className="h-1 w-full bg-linear-to-r from-amber-300 via-orange-300 to-amber-300" />
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <p className="text-neutral-500 text-sm">Loading notifications...</p>
          )}

          {/* EMPTY STATE */}
          {!loading && notifications.length === 0 && (
            <div className="py-20 text-center lg:translate-x-10">
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
    </div>
  );
}
