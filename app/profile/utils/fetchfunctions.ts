import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  useMutation,
  InfiniteData,
} from "@tanstack/react-query";

import {
  COMMENT_API_PATH,
  LIKE_POST_API_PATH,
  LOGOUT_API_PATH,
  ME_API_PATH,
  POST_API_PATH,
  REPLIES_API_PATH,
  SINGLE_POST_API_PATH,
  VOTE_POST_API_PATH,
  LINK_PREVIEW_API_PATH,
} from "@/lib/constants";
import PostsPage from "@/types/PostsPage";
import LinkEmbed from "@/types/LinkEmbeds";
import JobDraft from "@/types/JobDraft";

// calls /me
export async function fetchUser() {
  const res = await fetch(ME_API_PATH, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();
  return data.user;
}

// calls /logout
export async function handleLogout(redirect: () => void) {
  try {
    const res = await fetch(LOGOUT_API_PATH, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Logout failed");
    }

    redirect();
  } catch (e) {
    console.error("Logout error:", e instanceof Error ? e.message : e);
    return false;
  }
}

// calls /posts (POST)
export async function handleCreatePost(
  postType: string,
  title: string,
  postContent: string,
  selectedVisibility: string,
  disableComments: boolean,
  uploadedMedia: {
    blobName: string;
    thumbnailBlobName?: string;
    type: string;
    name: string;
    mimetype: string;
    size: number;
  }[],
  setIsOpen: (state: boolean) => void,
  // links
  links?: LinkEmbed[],
  // poll params
  pollOptions?: string[],
  pollDuration?: number,
  // job
  job?: JobDraft,
) {
  try {
    const isPoll = postType === "poll";

    if (postType === "job_post" && !job) {
      throw new Error("Job post missing job payload");
    }

    const res = await fetch(POST_API_PATH, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType,
        title,
        content: postContent,
        visibility: selectedVisibility,
        commentsDisabled: disableComments,
        links: links,
        media: uploadedMedia,
        pollOptions: isPoll ? pollOptions : undefined,
        pollDuration: isPoll ? pollDuration : undefined,
        ...(postType === "job_post" && job ? { job } : {}),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend error:", errorText);
      throw new Error(`Failed to create post: ${errorText}`);
    }

    const createdPost = await res.json();
    setIsOpen(false);
    return createdPost;
  } catch (error) {
    console.error("Create post error:", error);
  }
}

// calls /posts (GET)
export async function fetchPosts({
  pageParam = null,
}: {
  pageParam?: string | null;
}) {
  const url = pageParam
    ? `${POST_API_PATH}?cursor=${pageParam}`
    : POST_API_PATH;

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Client side error; Failed to fetch posts");
  }

  return await res.json();
}

export async function deletePost(postId: string) {
  const res = await fetch(`${POST_API_PATH}?postId=${postId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to toggle like");
  }

  return res.json();
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: (_, postId) => {
      // Update the infinite query structure
      queryClient.setQueryData(["posts"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((post: any) => post.id !== postId),
          })),
        };
      });
    },
  });
}

// post edit function
export async function editPost({
  postId,
  data,
}: {
  postId: string;
  data: any; // or use your CreatePostSchema type
}) {
  const res = await fetch(`${POST_API_PATH}?postId=${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data), // Include the updated post data
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to edit post");
  }

  return res.json();
}

export function useEditPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: editPost,
    onSuccess: (updatedPost) => {
      // Update the post in the infinite query cache
      queryClient.setQueryData(["posts"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) =>
              post.id === updatedPost.id ? updatedPost : post,
            ),
          })),
        };
      });
    },
  });
}

export async function fetchSinglePost(postId: string) {
  const res = await fetch(SINGLE_POST_API_PATH(postId));

  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: () => fetchSinglePost(postId),
    enabled: !!postId, // safety
  });
}

// calls /posts/:postId/comments
export async function createComment({
  postId,
  content,
  parentCommentId,
}: {
  postId: string;
  content: string;
  parentCommentId?: string;
}) {
  const res = await fetch(COMMENT_API_PATH(postId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      parentCommentId,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to create comment");
  }

  return res.json();
}

export function useTopLevelComments(postId: string, commentsDisabled = false) {
  return useInfiniteQuery({
    queryKey: ["comments", postId],
    initialPageParam: null,
    enabled: !commentsDisabled,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        COMMENT_API_PATH(postId) + (pageParam ? `?cursor=${pageParam}` : ""),
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}

export async function fetchReplies({
  postId,
  commentId,
  cursor,
}: {
  postId: string;
  commentId: string;
  cursor?: string | null;
}) {
  const params = cursor ? `?cursor=${cursor}` : "";
  const res = await fetch(`${REPLIES_API_PATH(postId, commentId)}${params}`);
  if (!res.ok) throw new Error("Failed to fetch replies");
  return res.json();
}

export function useReplies(postId: string, commentId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["replies", commentId],
    initialPageParam: null,
    enabled,
    queryFn: ({ pageParam }) =>
      fetchReplies({
        postId,
        commentId,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}

type PostsInfiniteData = InfiniteData<PostsPage>;

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    Error,
    { postId: string; isLiked: boolean },
    { previousPosts?: PostsInfiniteData }
  >({
    mutationFn: ({ postId }) => callPostLikeUpdate({ postId }),

    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previousPosts = queryClient.getQueryData<PostsInfiniteData>([
        "posts",
      ]);

      queryClient.setQueryData<PostsInfiniteData>(["posts"], (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    likeCount:
                      post.likeCount && post.likeCount + (isLiked ? -1 : 1),
                    isLiked: !isLiked, // 🔥 important
                  }
                : post,
            ),
          })),
        };
      });

      return { previousPosts };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(["posts"], context.previousPosts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export async function callPostLikeUpdate({ postId }: { postId: string }) {
  const res = await fetch(LIKE_POST_API_PATH(postId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to toggle like");
  }

  return res.json();
}

// calls /posts/:postId/vote
export async function voteInPoll(postId: string, optionIndex: number) {
  const res = await fetch(VOTE_POST_API_PATH(postId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionIndex }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Vote failed");
  }

  return res.json() as Promise<{
    success: true;
    pollVotes: Record<string, string[]>;
  }>;
}

export function useVoteInPoll(postId: string, currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (optionIndex: number) => voteInPoll(postId, optionIndex),

    onMutate: async (optionIndex) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previousPosts = queryClient.getQueryData<any>(["posts"]);

      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => {
              if (post.id !== postId) return post;

              const updatedVotes = { ...(post.pollVotes || {}) };

              // remove user from all options
              Object.keys(updatedVotes).forEach((key) => {
                updatedVotes[key] = updatedVotes[key].filter(
                  (id: string) => id !== currentUserId,
                );
              });

              // add user to selected option
              updatedVotes[optionIndex] = [
                ...(updatedVotes[optionIndex] || []),
                currentUserId,
              ];

              return {
                ...post,
                pollVotes: updatedVotes,
              };
            }),
          })),
        };
      });

      return { previousPosts };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousPosts) {
        queryClient.setQueryData(["posts"], ctx.previousPosts);
      }
    },
  });
}

type LinkPreviewResponse = {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
};

export const useFetchLinkPreview = () => {
  return useMutation({
    mutationFn: async (url: string): Promise<LinkPreviewResponse> => {
      const response = await fetch(LINK_PREVIEW_API_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch link preview");
      }

      return response.json();
    },
  });
};
