"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Loader2,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";

import Post from "@/app/components/Post";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import {
  COMMUNITIES_API_PATH,
  FOLLOW_COMMUNITY_API_PATH,
  POST_API_PATH,
} from "@/lib/constants";
import { fetchUser } from "@/app/(main)/profile/utils/fetchfunctions";
import { setInvalidatePosts } from "@/lib/services/uploadService";
import { useActorStore } from "@/lib/stores/actorStore";
import type PostType from "@/types/Post";

type Community = {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  location: string | null;
  profilePic: string | null;
  coverPhoto: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isFollowing: boolean;
  _count: {
    followers: number;
    posts: number;
  };
};

type CommunitiesResponse = {
  communities: Community[];
  followedCommunities: Community[];
  availableCommunities: Community[];
};

type PostsResponse = {
  posts: PostType[];
  nextCursor: string | null;
};

function CommunityAvatar({
  community,
  size = 44,
}: {
  community: Pick<Community, "name" | "profilePic">;
  size?: number;
}) {
  const resolvedUrl = useResolvedMediaUrl(
    community.profilePic,
    "/default_profile.jpg",
  );

  return (
    <Image
      src={resolvedUrl}
      alt={community.name}
      width={size}
      height={size}
      className="rounded-lg object-cover"
    />
  );
}

function SidebarCommunityButton({
  community,
  active,
  onClick,
}: {
  community: Community;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
        active ? "bg-red-50 text-red-700" : "hover:bg-slate-100 text-slate-700"
      }`}
    >
      <CommunityAvatar community={community} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{community.name}</p>
        <p className="text-xs text-slate-500">
          {community._count.posts} posts
        </p>
      </div>
    </button>
  );
}

export default function CommunityPage() {
  const [query, setQuery] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const selectedActor = useActorStore((state) => state.selectedActor);
  const canFollowCommunities = selectedActor.type === "USER";

  useEffect(() => {
    setInvalidatePosts(() => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    });
  }, [queryClient]);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const { data: communitiesData, isLoading: communitiesLoading } =
    useQuery<CommunitiesResponse>({
      queryKey: ["communities"],
      queryFn: async () => {
        const res = await fetch(COMMUNITIES_API_PATH, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch communities");
        return res.json();
      },
    });

  const followedCommunities = useMemo(
    () => communitiesData?.followedCommunities ?? [],
    [communitiesData?.followedCommunities],
  );
  const availableCommunities = useMemo(
    () => communitiesData?.availableCommunities ?? [],
    [communitiesData?.availableCommunities],
  );
  const allCommunities = useMemo(
    () => communitiesData?.communities ?? [],
    [communitiesData?.communities],
  );
  const selectedCommunity = selectedCommunityId
    ? allCommunities.find((community) => community.id === selectedCommunityId)
    : null;

  const filteredFollowed = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return followedCommunities;
    return followedCommunities.filter((community) =>
      community.name.toLowerCase().includes(normalized),
    );
  }, [followedCommunities, query]);

  const filteredAvailable = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableCommunities;
    return availableCommunities.filter((community) =>
      community.name.toLowerCase().includes(normalized),
    );
  }, [availableCommunities, query]);

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsResponse>({
    queryKey: ["community-posts", selectedCommunityId, selectedActor],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ feed: "community" });
      params.set("actorType", selectedActor.type);
      if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
        params.set("actorCommunityId", selectedActor.communityId);
      }
      if (typeof pageParam === "string" && pageParam) {
        params.set("cursor", pageParam);
      }
      if (selectedCommunityId) {
        params.set("communityId", selectedCommunityId);
      }

      const res = await fetch(`${POST_API_PATH}?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch community posts");
      return res.json();
    },
    enabled: !!user,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || !hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
      },
      { rootMargin: "800px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, selectedCommunityId]);

  async function toggleFollow(community: Community) {
    const res = await fetch(FOLLOW_COMMUNITY_API_PATH(community.id), {
      method: community.isFollowing ? "DELETE" : "POST",
      credentials: "include",
    });

    if (!res.ok) return;

    await queryClient.invalidateQueries({ queryKey: ["communities"] });
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-100">
      <div className="grid min-h-[calc(100vh-73px)] lg:grid-cols-[360px_1fr]">
        <aside className="border-r border-slate-200 bg-white">
          <div className="sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-slate-950">Community</h1>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <UsersRound className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search communities"
                className="h-11 w-full rounded-full border border-slate-200 bg-slate-100 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-50"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedCommunityId(null)}
              className={`mt-5 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${
                !selectedCommunityId
                  ? "bg-slate-100 text-red-600"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your feed</p>
                <p className="text-xs text-slate-500">Recent activity</p>
              </div>
            </button>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-950">
                  Followed communities
                </h2>
                <span className="text-xs text-slate-400">
                  {followedCommunities.length}
                </span>
              </div>

              {communitiesLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                </div>
              ) : filteredFollowed.length ? (
                <div className="space-y-1">
                  {filteredFollowed.map((community) => (
                    <div
                      key={community.id}
                      className="flex items-center gap-2 rounded-md pr-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <SidebarCommunityButton
                          community={community}
                          active={selectedCommunityId === community.id}
                          onClick={() => setSelectedCommunityId(community.id)}
                        />
                      </div>
                      {canFollowCommunities && (
                        <button
                          type="button"
                          onClick={() => toggleFollow(community)}
                          className="h-8 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          Unfollow
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400">
                  No followed communities.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <h2 className="mb-2 text-sm font-bold text-slate-950">
                Available communities
              </h2>

              {filteredAvailable.length ? (
                <div className="space-y-2">
                  {filteredAvailable.map((community) => (
                    <div
                      key={community.id}
                      className="rounded-md px-3 py-2 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCommunityId(community.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <CommunityAvatar community={community} size={40} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {community.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {community._count.followers} followers
                            </p>
                          </div>
                        </button>
                        {canFollowCommunities && (
                          <button
                            type="button"
                            onClick={() => toggleFollow(community)}
                            className="inline-flex h-8 items-center gap-1 rounded-md bg-red-50 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Follow
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400">
                  No available communities.
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {selectedCommunity?.name ?? "Recent activity"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedCommunity
                  ? "Posts from this community page"
                  : "Posts from all communities"}
              </p>
            </div>

            {postsLoading ? (
              <div className="space-y-4">
                <Post isLoading={true} />
                <Post isLoading={true} />
              </div>
            ) : posts.length ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    user={user}
                    post={post}
                    isLoading={false}
                  />
                ))}

                {hasNextPage && (
                  <div
                    ref={loadMoreRef}
                    className="flex h-14 items-center justify-center text-sm text-slate-500"
                  >
                    {isFetchingNextPage && "Loading more posts..."}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
                <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No community posts yet.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
