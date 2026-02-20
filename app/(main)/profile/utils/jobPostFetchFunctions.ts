import {
  CLOSE_JOB_POST_API_PATH,
  JOB_APPLICATION_API_PATH,
  JOB_APPLICATION_DETAIL_API_PATH,
  JOB_POST_API_PATH,
  REOPEN_JOB_POST_API_PATH,
  VIEW_JOB_APPLICATIONS_API_PATH,
} from "@/lib/constants";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export function useApplyJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobPostId,
      postId,
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

      if (!res.ok) throw new Error("Failed");

      return res.json();
    },

    onSuccess: (_data, variables) => {
      const { jobPostId, postId } = variables;

      // feed cache
      queryClient.setQueryData(["posts"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) =>
              post.jobPost?.id === jobPostId
                ? {
                    ...post,
                    jobPost: {
                      ...post.jobPost,
                      hasApplied: true,
                      applicationStatus: "APPLIED",
                    },
                  }
                : post,
            ),
          })),
        };
      });

      // ✅ FIXED KEY HERE
      queryClient.setQueryData(["post", postId], (oldPost: any) => {
        if (!oldPost) return oldPost;

        return {
          ...oldPost,
          jobPost: {
            ...oldPost.jobPost,
            hasApplied: true,
            applicationStatus: "APPLIED",
          },
        };
      });
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({
        queryKey: ["post", variables.postId],
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
        console.log(res);
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
