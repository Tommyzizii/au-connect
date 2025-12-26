"use client";

import { useEffect } from "react";
import LeftProfile from "./components/Feed_LeftProfile";
import MainFeed from "./components/Feed_MainFeed";
import RightEvents from "./components/Feed_RightEvents";
import { fetchPosts, fetchUser } from "./profile/utils/fetchfunctions";
import PostType from "@/types/Post";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

const mockEvents = [
  {
    id: 1,
    title: "Loi Krathong",
    location: "Sala Thai",
    date: "Wednesday, 05/11/2025",
  },
  {
    id: 2,
    title: "Christmas Eve",
    location: "SM",
    date: "Wednesday, 25/12/2025",
  },
];

export default function Home() {
  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  // POSTS (infinite)
  const {
    data,
    isLoading: postLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    enabled: !!user,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useEffect(() => {
    console.log(user);
  }, [user])

  // FLATTEN POSTS
  const posts: PostType[] = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="md:grid md:grid-cols-12 md:gap-6">
          <LeftProfile user={user} loading={userLoading} />

          {user && (
            <MainFeed
              user={user}
              posts={posts}
              loading={postLoading}
              fetchNextPage={fetchNextPage}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          )}

          <RightEvents events={mockEvents} loading={false} />
        </div>
      </div>
    </div>
  );
}
