export async function fetchProfileJobPosts({
  pageParam,
  userId,
  jobTab,
}: {
  pageParam?: string | null;
  userId: string;
  jobTab: "hiring" | "saved" | "applied";
}) {
  const params = new URLSearchParams();
  if (pageParam) params.set("cursor", pageParam);
  params.set("jobTab", jobTab);

  const res = await fetch(
    `/api/connect/v1/profile/${userId}/jobs?${params.toString()}`,
    { credentials: "include" }
  );

  if (!res.ok) throw new Error("Failed to fetch profile job posts");
  return res.json(); // { posts, nextCursor }
}
