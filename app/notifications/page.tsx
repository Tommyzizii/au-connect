"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

import { timeAgo } from "@/lib/timeAgo";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";

type Notification = {
  id: string;
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED";
  isRead: boolean;
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    profilePic?: string;
  };
};

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

  return (
    <main className="min-h-screen bg-white">
      <div className="h-full overflow-y-auto flex flex-col items-center pt-6 px-4 sm:pt-8 md:pt-10">
        <section className="w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2">
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
                    prev.map((n) => ({ ...n, isRead: true }))
                  );
                }}
                className="ml-auto text-sm text-blue-600 hover:underline font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loading && (
            <p className="text-neutral-500 text-sm">Loading notifications...</p>
          )}

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

          <div className="space-y-4">
            {notifications.map((notification) => {
              const fromUser = notification.fromUser;

              return (
                <div
                  key={notification.id}
                  onClick={async () => {
                    if (!notification.isRead) {
                      await markNotificationRead(notification.id);
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === notification.id
                            ? { ...n, isRead: true }
                            : n
                        )
                      );
                    }

                    if (fromUser?.id) {
                      const slug = buildSlug(
                        fromUser.username || "",
                        fromUser.id
                      );
                      router.push(`/profile/${slug}`);
                    }
                  }}
                  className={`group relative overflow-hidden rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
                    notification.isRead
                      ? "bg-linear-to-br from-neutral-50 to-neutral-100/50 border-neutral-200/50 hover:shadow-xl hover:scale-[1.02]"
                      : "bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:shadow-xl hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* AVATAR */}
                    <div className="relative">
                      <div className="relative h-16 w-16 rounded-2xl overflow-hidden ring-2 ring-neutral-200 group-hover:ring-blue-400 transition-all">
                        <Image
                          src={fromUser?.profilePic || "/default_profile.jpg"}
                          alt={fromUser?.username || "User"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {!notification.isRead && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 hover:underline">
                        {fromUser?.username || "Unknown user"}
                      </p>

                      <p className="text-sm text-neutral-600 font-medium">
                        {notification.type === "CONNECTION_REQUEST" &&
                          "sent you a connection request"}
                        {notification.type === "CONNECTION_ACCEPTED" &&
                          "accepted your connection request"}
                      </p>

                      <span className="text-xs text-neutral-500 mt-1 block">
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