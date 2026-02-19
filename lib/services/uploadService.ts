import { useUploadStore } from "@/lib/stores/uploadStore";
import { uploadFile } from "@/app/(main)/profile/utils/uploadMedia";
import { handleCreatePost } from "@/app/(main)/profile/utils/fetchfunctions";
import { editPost } from "@/app/(main)/profile/utils/fetchfunctions";
import PostType from "@/types/Post";

let invalidatePostsFn: (() => void) | null = null;

export function setInvalidatePosts(fn: () => void) {
  invalidatePostsFn = fn;
  console.log("✅ invalidatePostsFn set");
}

function invalidatePostsSafe() {
  if (invalidatePostsFn) {
    invalidatePostsFn();
  } else {
    console.warn("⚠️ invalidatePostsFn not set yet");
  }
}

let invalidateProfilePostsFn: (() => void) | null = null;

export function setInvalidateProfilePosts(fn: () => void) {
  invalidateProfilePostsFn = fn;
  console.log("✅ invalidateProfilePostsFn set");
}

function invalidateProfilePostsSafe() {
  if (invalidateProfilePostsFn) {
    invalidateProfilePostsFn();
  } else {
    console.warn("⚠️ invalidateProfilePostsFn not set yet");
  }
}


export async function processUpload(jobId: string) {
  // get data from the zustand state
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job) {
    console.log("❌ Job not found:", jobId);
    return;
  }

  if (job.postType === "job_post" && !job.job) {
    throw new Error("Job post missing job payload");
  }

  console.log("🚀 Starting upload for job:", jobId);

  try {
    store.updateJobStatus(jobId, "uploading");

    const uploadItems = job.media.filter(
      (item): item is typeof item & { file: File } => !!item.file,
    );

    const total = uploadItems.length || 1;

    // get blob names for every uploaded media
    const uploadedMedia = await Promise.all(
      uploadItems.map(async (item, index) => {
        const { blobName, thumbnailBlobName } = await uploadFile(item.file);
        if (!blobName) throw new Error("Upload failed");

        const progress = Math.floor(((index + 1) / total) * 80);
        store.updateJobProgress(jobId, progress);

        return {
          blobName,
          thumbnailBlobName,
          type: item.type,
          name: item.file.name,
          mimetype: item.file.type,
          size: item.file.size,
        };
      }),
    );

    console.log("✅ Media uploaded:", uploadedMedia);

    store.updateJobProgress(jobId, 90);

    // Create post
    const createdPost = await handleCreatePost(
      job.postType,
      job.title,
      job.content,
      job.visibility,
      job.disableComments,
      uploadedMedia,
      () => {},
      job.links,
      job.pollOptions,
      job.pollDuration,
      job.job,
    );

    console.log("✅ Post created:", createdPost);

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    invalidatePostsSafe();
    invalidateProfilePostsSafe();

    setTimeout(() => store.removeJob(jobId), 3000);
  } catch (error) {
    console.error("❌ Upload failed:", error);
    store.setJobError(
      jobId,
      error instanceof Error ? error.message : "Upload failed",
    );
  }
}

// edit post job function
export async function processEdit(jobId: string) {
  // get data from zustand state
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job || !job.isEdit || !job.postId) return;

  try {
    store.updateJobStatus(jobId, "uploading");

    // get blob by uploading media
    const uploadedNewMedia = await Promise.all(
      job.media
        .filter((item): item is typeof item & { file: File } => !!item.file)
        .map(async (item) => {
          const uploadResult = await uploadFile(item.file);

          return {
            blobName: uploadResult.blobName,
            thumbnailBlobName: uploadResult.thumbnailBlobName,
            type: item.type,
            name: item.file.name,
            mimetype: item.file.type,
            size: item.file.size,
          };
        }),
    );

    store.updateJobProgress(jobId, 90);

    if (!job.existingMedia) {
      throw new Error("Edit job missing existingMedia");
    }

    const finalMedia = [
      ...job.existingMedia.map((m) => ({
        blobName: m.blobName,
        thumbnailBlobName: m.thumbnailBlobName ?? null,
        type: m.type,
        name: m.name,
        mimetype: m.mimetype,
        size: m.size,
      })),
      ...uploadedNewMedia.filter(Boolean),
    ];

    const payload: any = {
      postType: job.postType,
      title: job.title,
      content: job.content,
      visibility: job.visibility,
      commentsDisabled: job.disableComments,
      links: job.links,
      media: finalMedia,
    };

    // if post is a poll add poll data
    if (job.postType === "poll") {
      payload.pollOptions = job.pollOptions;
      payload.pollDuration = job.pollDuration;
    }

    // if post is a job post, add job post data
    if (job.postType === "job_post") {
      payload.job = job.job;
    }

    // call the front end api call function linked with react query
    await editPost({
      postId: job.postId,
      data: payload,
    });

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    invalidatePostsSafe();
    invalidateProfilePostsSafe();

    setTimeout(() => store.removeJob(jobId), 3000);
  } catch (err) {
    store.setJobError(jobId, "Edit failed");
  }
}
