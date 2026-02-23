"use client";
import { useEffect } from "react";
import LeftProfile from "../components/Feed_LeftProfile";
import MainFeed from "../components/Feed_MainFeed";
import Image from "next/image";
import { fetchPosts, fetchUser } from "./profile/utils/fetchfunctions";
import PostType from "@/types/Post";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { setInvalidatePosts } from "@/lib/services/uploadService";

export default function Home() {
  // Get query client and pass to upload service
  const queryClient = useQueryClient();

  useEffect(() => {
    setInvalidatePosts(() => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    });
  }, [queryClient]);

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

  // FLATTEN POSTS
  const posts: PostType[] = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="h-full">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="md:grid md:grid-cols-12 md:gap-6">
          <div className="border border-grey-300 lg:col-span-3 md:col-span-4 hidden md:block">
            <LeftProfile user={user} loading={userLoading} />
          </div>

          <div className="lg:col-span-6 md:col-span-7">
            {user && (
              <MainFeed
                user={user}
                userLoading={userLoading}
                posts={posts}
                loading={postLoading}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            )}
          </div>

          <div className="hidden lg:block col-span-3">
            <div className="bg-white border-l-4 border-red-600 rounded-xl p-6 shadow-sm flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-serif italic text-neutral-900">
                  Labor Omnia Vincit
                </h3>
                <p className="text-sm text-neutral-600 mt-2">
                  Work conquers all things
                </p>
              </div>

              {/* AU Logo */}
              <div className="shrink-0">
                <div className="h-16 w-16 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/au-logo.png"
                    alt="Assumption University of Thailand"
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
