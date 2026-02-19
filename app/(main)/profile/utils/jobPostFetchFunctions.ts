import { JOB_APPLICATION_API_PATH } from "@/lib/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
