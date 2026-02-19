export async function fetchNotifications() {
  const res = await fetch("/api/connect/v1/notifications", {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string) {
  const res = await fetch(`/api/connect/v1/notifications/${id}`, {
    method: "PATCH",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

export async function fetchUnreadCount() {
  const res = await fetch(
    "/api/connect/v1/notifications/unread-count",
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(
    "/api/connect/v1/notifications/mark-all-read",
    {
      method: "PATCH",
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return res.json();
}
