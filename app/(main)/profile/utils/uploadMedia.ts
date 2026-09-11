import { MEDIA_UPLOAD_API_PATH } from "@/lib/constants";

export async function uploadFile(file: File, purpose: "post" | "general" = "general") {
  // Ask server for a SAS upload URL
  const res = await fetch(MEDIA_UPLOAD_API_PATH, {
    method: "POST",
    body: JSON.stringify({
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size,
      purpose,
    }),
  });

  const response = await res.json();
  if (!res.ok) {
    throw new Error(response.error || "Could not prepare upload");
  }
  const { uploadUrl, blobName, thumbnailBlobName } = response;

  if (!uploadUrl) {
    throw new Error("No upload URL returned");
  }

  if (!blobName) {
    throw new Error("No blobName returned; file name missing");
  }

  // Upload DIRECTLY to Azure
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type,
      "Content-Length": file.size.toString(),
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Azure upload failed");
  }

  // Return the blob name or file name
  return {
    blobName,
    thumbnailBlobName,
  };
}
