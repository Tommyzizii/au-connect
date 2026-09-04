/** Derive the Azure Function's deterministic poster blob name for a video. */
export function getVideoThumbnailBlobName(videoBlobName: string): string {
  const fileName = videoBlobName.split("/").pop() ?? videoBlobName;
  const lastDot = fileName.lastIndexOf(".");
  const stem = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;

  return `thumbnails/${stem}.jpg`;
}
