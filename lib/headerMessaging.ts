export async function fetchUnreadMessagesCount() {
  const res = await fetch("/api/connect/v1/messages/unread-count", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch unread messages count");
  return res.json() as Promise<{ count: number }>;
}
