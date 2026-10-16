import {
  CLOSE_JOB_POST_API_PATH,
  JOB_API_PATH,
  JOB_APPLICATION_API_PATH,
  JOB_APPLICATION_DETAIL_API_PATH,
  JOB_POST_API_PATH,
  REOPEN_JOB_POST_API_PATH,
  VIEW_JOB_APPLICATIONS_API_PATH,
} from "@/lib/constants";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import PostType from "@/types/Post";
import { VerificationRequiredError } from "@/lib/verificationError";

export function useApplyJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobPostId,
      resumeFile,
      resumeLetter,
      expectedSalary,
      availability,
    }: {
      jobPostId: string;
      postId: string;
      resumeFile: File;
      resumeLetter?: string;
      expectedSalary?: number;
      availability?: string;
    }) => {
      const formData = new FormData();

      formData.append("resumeFile", resumeFile);

      if (resumeLetter) formData.append("resumeLetter", resumeLetter);
      if (expectedSalary)
        formData.append("expectedSalary", expectedSalary.toString());
      if (availability) formData.append("availability", availability);

      const res = await fetch(JOB_APPLICATION_API_PATH(jobPostId), {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err?.requiresVerification) throw new VerificationRequiredError();
        throw new Error(err?.error || "Failed");
      }

      return res.json();
    },

    onSuccess: (_data, variables) => {
      const { jobPostId, postId } = variables;

      const markApplied = (post: any) =>
        post.jobPost?.id === jobPostId
          ? {
              ...post,
              jobPost: {
                ...post.jobPost,
                hasApplied: true,
                applicationStatus: "APPLIED",
                applicantCount:
                  typeof post.jobPost.applicantCount === "number"
                    ? post.jobPost.applicantCount + 1
                    : post.jobPost.applicantCount,
              },
            }
          : post;

      // feed cache
      queryClient.setQueryData(["posts"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map(markApplied),
          })),
        };
      });

      // jobs page cache
      queryClient.setQueriesData(
        { queryKey: ["job-posts"], exact: false },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              jobs: page.jobs.map(markApplied),
            })),
          };
        },
      );

      queryClient.setQueriesData(
        { queryKey: ["post", postId], exact: false },
        (oldPost: any) => {
          if (!oldPost) return oldPost;

          return {
            ...oldPost,
            jobPost: {
              ...oldPost.jobPost,
              hasApplied: true,
              applicationStatus: "APPLIED",
              applicantCount:
                typeof oldPost.jobPost?.applicantCount === "number"
                  ? oldPost.jobPost.applicantCount + 1
                  : oldPost.jobPost?.applicantCount,
            },
          };
        },
      );
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["job-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({
        queryKey: ["post", variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["applicants", variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["jobPostDetail", variables.postId],
      });
    },
  });
}

export interface Applicant {
  id: string;
  status: string;
  createdAt: string;
  resumeBlobName: string;

  applicant: {
    id: string;
    username: string;
    email: string;
    profilePic?: string;
    title?: string;
    location?: string;
  };
}

export function useApplicants(postId: string) {
  return useQuery({
    queryKey: ["applicants", postId],

    queryFn: async (): Promise<Applicant[]> => {
      const res = await fetch(VIEW_JOB_APPLICATIONS_API_PATH(postId));

      if (!res.ok) {
        // console.log(res);
        throw new Error("Failed to fetch applicants");
      }

      const data = await res.json();

      return data.applications;
    },

    enabled: !!postId,
  });
}

export function useApplicationDetail(postId: string, applicationId: string) {
  return useQuery({
    queryKey: ["application", postId, applicationId],
    queryFn: async () => {
      const res = await fetch(
        JOB_APPLICATION_DETAIL_API_PATH(postId, applicationId),
      );
      if (!res.ok) throw new Error("Failed to fetch application");
      return res.json();
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      applicationId,
      status,
    }: {
      postId: string;
      applicationId: string;
      status: "APPLIED" | "SHORTLISTED" | "REJECTED";
    }) => {
      const res = await fetch(
        JOB_APPLICATION_DETAIL_API_PATH(postId, applicationId),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["application", variables.postId, variables.applicationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["applicants", variables.postId],
      });
    },
  });
}

export type JobPostDetail = {
  id: string;
  title: string;
  companyName: string;
  status: "OPEN" | "CLOSED";
  applicantCount: number;
};

export function useJobPost(postId: string) {
  return useQuery({
    queryKey: ["jobPostDetail", postId],

    queryFn: async (): Promise<JobPostDetail> => {
      const res = await fetch(JOB_POST_API_PATH(postId));

      if (!res.ok) {
        throw new Error("Failed to fetch job post");
      }

      return res.json();
    },

    enabled: !!postId,
  });
}

export function useCloseJobPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(CLOSE_JOB_POST_API_PATH(postId), {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to close job");
      }

      return res.json();
    },

    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["jobPostDetail", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["applicants", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["post", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["posts"],
      });
    },
  });
}

export function useReopenJobPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(REOPEN_JOB_POST_API_PATH(postId), {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to reopen job");
      }

      return res.json();
    },

    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: ["jobPostDetail", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["applicants", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["post", postId],
      });

      queryClient.invalidateQueries({
        queryKey: ["posts"],
      });
    },
  });
}

// TODO: move to types file
// this is for the jobs page section
export type JobTab = "all" | "saved" | "applied";

type FetchJobPostsParams = {
  pageParam?: string | null;

  keyword?: string;
  empType?: string[];
  locType?: string[];
  salaryRange?: string;
  salaryCurrency?: string;
  tab?: JobTab;
};

type JobPostsPage = {
  jobs: PostType[];
  nextCursor: string | null;
};

export async function fetchJobPosts({
  pageParam = null,
  keyword,
  empType,
  locType,
  salaryRange,
  salaryCurrency,
  tab,
}: FetchJobPostsParams): Promise<JobPostsPage> {
  const params = new URLSearchParams();

  if (pageParam) params.set("cursor", pageParam);

  if (keyword) params.set("keyword", keyword);

  if (empType?.length) params.set("empType", empType.join(","));

  if (locType?.length) params.set("locType", locType.join(","));

  if (salaryRange) params.set("salaryRange", salaryRange);

  if (salaryCurrency) params.set("salaryCurrency", salaryCurrency);

  if (tab && tab !== "all") params.set("tab", tab);

  const res = await fetch(`${JOB_API_PATH}?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job posts");
  }

  return res.json();
}

// TODO: move to types file
type UseJobPostsParams = {
  keyword?: string;
  empType?: string[];
  locType?: string[];
  salaryRange?: string;
  salaryCurrency?: string;
  tab?: JobTab;
};

export function useJobPosts({
  keyword,
  empType,
  locType,
  salaryRange,
  salaryCurrency,
  tab,
}: UseJobPostsParams) {
  return useInfiniteQuery<
    JobPostsPage,
    Error,
    InfiniteData<JobPostsPage>,
    (string | string[] | undefined)[],
    string | null
  >({
    queryKey: [
      "job-posts",
      keyword,
      empType,
      locType,
      salaryRange,
      salaryCurrency,
      tab,
    ],
    placeholderData: (previousData) => previousData,

    queryFn: ({ pageParam }) =>
      fetchJobPosts({
        pageParam,
        keyword,
        empType,
        locType,
        salaryRange,
        salaryCurrency,
        tab,
      }),

    initialPageParam: null,

    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ?? undefined;
    },
  });
}
