import { useUploadStore } from "@/lib/stores/uploadStore";
import { uploadFile } from "@/app/profile/utils/uploadMedia";
import { handleCreatePost } from "@/app/profile/utils/fetchfunctions";
import { editPost } from "@/app/profile/utils/fetchfunctions";

let queryClientInstance: any = null;

export function setQueryClient(client: any) {
  queryClientInstance = client;
  console.log("✅ Query client set:", !!client);
}

export async function processUpload(jobId: string) {
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job) {
    console.log("❌ Job not found:", jobId);
    return;
  }

  console.log("🚀 Starting upload for job:", jobId);

  try {
    store.updateJobStatus(jobId, "uploading");

    // Upload media files
    const uploadedMedia = await Promise.all(
      job.media.map(async (item, index) => {
        // little bit sloppy error handling for variable types
        if (!item.file) {
          return;
        }
        const { blobName, thumbnailBlobName } = await uploadFile(item.file);
        if (!blobName) throw new Error("Upload failed");

        const total = job.media.length || 1;
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
    );

    console.log("✅ Post created:", createdPost);

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    // ✅ Update post list
    console.log("🔄 Invalidating queries...");
    console.log("Query client exists?", !!queryClientInstance);

    if (queryClientInstance) {
      await queryClientInstance.invalidateQueries({ queryKey: ["posts"] });
      console.log("✅ Queries invalidated - posts should refresh now!");
    } else {
      console.error("❌ Query client is null! Did you call setQueryClient?");
    }

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
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job || !job.isEdit || !job.postId) return;

  try {
    store.updateJobStatus(jobId, "uploading");

    const uploadedNewMedia = await Promise.all(
      job.media.map(async (item) => {
        if (!item.file) return null;

        const uploadResult = await uploadFile(item.file);

        return {
          blobName: uploadResult.blobName,
          thumbnailBlobName: uploadResult.thumbnailBlobName ?? null,
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
    await editPost({
      postId: job.postId,
      data: {
        postType: job.postType,
        title: job.title,
        content: job.content,
        visibility: job.visibility,
        media: finalMedia,
      },
    });

    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    if (queryClientInstance) {
      await queryClientInstance.invalidateQueries({ queryKey: ["posts"] });
    }

    setTimeout(() => store.removeJob(jobId), 3000);
  } catch (err) {
    store.setJobError(jobId, "Edit failed");
  }
}
