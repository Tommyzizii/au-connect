export async function fetchProfilePosts({
  pageParam,
  userId,
  tab,
}: {
  pageParam?: string | null;
  userId: string;
  tab: string;
}) {
  const params = new URLSearchParams();
  if (pageParam) params.set("cursor", pageParam);
  if (tab) params.set("tab", tab);

  const res = await fetch(
    `/api/connect/v1/profile/${userId}/posts?${params.toString()}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch profile posts");
  return res.json(); // { posts, nextCursor }
}
