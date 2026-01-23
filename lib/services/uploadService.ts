import { useUploadStore } from "@/lib/stores/uploadStore";
import { uploadFile } from "@/app/profile/utils/uploadMedia";
import { handleCreatePost } from "@/app/profile/utils/fetchfunctions";

let queryClientInstance: any = null;

export function setQueryClient(client: any) {
  queryClientInstance = client;
}

export async function processUpload(jobId: string) {
  const store = useUploadStore.getState();
  const job = store.jobs.find((j) => j.id === jobId);

  if (!job) return;

  try {
    store.updateJobStatus(jobId, "uploading");

    // Upload media files with progress tracking
    const uploadedMedia = await Promise.all(
      job.media.map(async (item, index) => {
        const { blobName, thumbnailBlobName } = await uploadFile(item.file);

        if (!blobName) {
          throw new Error("Upload failed: no URL returned");
        }

        // Update progress (rough estimate based on files completed)
        const progress = Math.floor(((index + 1) / job.media.length) * 80);
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

    // update progress to 90% before creating post
    store.updateJobProgress(jobId, 90);

    // Create post in database
    await handleCreatePost(
      job.postType,
      job.title,
      job.content,
      job.visibility,
      job.disableComments,
      uploadedMedia,
      () => {}, // No callback needed
    );

    // setting progress to complete
    store.updateJobProgress(jobId, 100);
    store.updateJobStatus(jobId, "complete");

    // update mutated post list
    if (queryClientInstance) {
      queryClientInstance.invalidateQueries({ queryKey: ["posts"] });
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
      store.removeJob(jobId);
    }, 3000);
  } catch (error) {
    console.error("Upload failed:", error);
    store.setJobError(
      jobId,
      error instanceof Error ? error.message : "Upload failed",
    );
  }
}
