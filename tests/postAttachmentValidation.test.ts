import assert from "node:assert/strict";
import test from "node:test";
import { BlockBlobClient } from "@azure/storage-blob";

// Isolated placeholders: these tests mock storage and never access an account.
for (const name of [
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET",
  "AZURE_STORAGE_ACCOUNT_KEY", "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_CONNECTION_STRING", "AZURE_STORAGE_CONTAINER_NAME",
  "NEXT_PUBLIC_BASE_URL", "JWT_SECRET",
]) process.env[name] = "test";

const userId = "a".repeat(24);
const blobName = `videos/posts-${userId}-12345678-1234-1234-1234-123456789abc.mp4`;
const attachment = { blobName, type: "video" as const, size: 1, name: "clip.mp4", mimetype: "video/mp4" };

test("video validation uses authoritative size and only signature bytes", async (t) => {
  const { validatePostAttachments } = await import("../lib/postAttachmentValidation");
  let size = 512_000_000;
  let header = Buffer.from("0000ftypisom");
  let deleted = 0;
  const reads: number[] = [];
  t.mock.method(BlockBlobClient.prototype, "getProperties", async () => ({ contentLength: size }));
  t.mock.method(BlockBlobClient.prototype, "downloadToBuffer", async (offset: number, count: number) => {
    assert.equal(offset, 0);
    reads.push(count);
    return header;
  });
  t.mock.method(BlockBlobClient.prototype, "downloadToFile", async () => {
    assert.fail("Video validation must not download a file");
  });
  t.mock.method(BlockBlobClient.prototype, "deleteIfExists", async () => { deleted++; });

  for (const extension of ["mp4", "mov", "webm"]) {
    header = extension === "webm" ? Buffer.from([0x1a, 0x45, 0xdf, 0xa3]) : Buffer.from("0000ftypisom");
    const [result] = await validatePostAttachments([{ ...attachment, blobName: blobName.replace(/mp4$/, extension) }], userId);
    assert.equal(result.size, 512_000_000);
  }
  assert.deepEqual(reads, [4096, 4096, 4096]);
  size++;
  await assert.rejects(validatePostAttachments([attachment], userId), /512 MB/);
  assert.equal(reads.length, 3);
  assert.equal(deleted, 1);

  size = 100;
  header = Buffer.from("invalid video signature");
  await assert.rejects(validatePostAttachments([attachment], userId), /bytes do not match/);
  assert.equal(deleted, 2);
  await assert.rejects(validatePostAttachments([attachment], userId, [attachment]), /bytes do not match/);
  assert.equal(deleted, 2, "Retained media must not be deleted");
  await assert.rejects(validatePostAttachments([attachment], "b".repeat(24)), /does not belong/);
  await assert.rejects(validatePostAttachments([attachment, attachment], userId), /at most 1 video/);
});
