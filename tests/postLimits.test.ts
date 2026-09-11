import assert from "node:assert/strict";
import test from "node:test";
import {
  attachmentLimitError,
  getUploadFormat,
  postContentLimitError,
  POST_LIMITS,
} from "../lib/postLimits";
import { consumePostQuota, PostLimitError } from "../lib/postQuota";

const image = (size: number = POST_LIMITS.imageBytes) => ({ type: "image" as const, size });
const video = (size: number = POST_LIMITS.videoBytes) => ({ type: "video" as const, size });
const document = (size: number = POST_LIMITS.documentBytes) => ({ type: "file" as const, size });

test("accepts inclusive byte limits and rejects one byte over", () => {
  assert.equal(attachmentLimitError([image(POST_LIMITS.imageBytes)]), undefined);
  assert.ok(attachmentLimitError([image(POST_LIMITS.imageBytes + 1)]));
  assert.equal(attachmentLimitError([video(POST_LIMITS.videoBytes)]), undefined);
  assert.ok(attachmentLimitError([video(POST_LIMITS.videoBytes + 1)]));
  assert.equal(attachmentLimitError([document(POST_LIMITS.documentBytes)]), undefined);
  assert.ok(attachmentLimitError([document(POST_LIMITS.documentBytes + 1)]));
});

test("enforces mixed attachment counts without a combined size cap", () => {
  assert.equal(
    attachmentLimitError([
      video(),
      ...Array.from({ length: 9 }, () => image()),
    ]),
    undefined,
  );
  assert.ok(attachmentLimitError([video(), ...Array.from({ length: 10 }, () => image())]));
  assert.ok(attachmentLimitError([video(), video()]));
  assert.ok(attachmentLimitError(Array.from({ length: 6 }, () => document())));
});

test("final edit state is checked after retained and new attachments merge", () => {
  const retained = [video()];
  assert.equal(attachmentLimitError([...retained, ...Array.from({ length: 9 }, () => image())]), undefined);
  assert.ok(attachmentLimitError([...retained, ...Array.from({ length: 10 }, () => image())]));
});

test("allows only listed formats", () => {
  for (const extension of ["jpg", "png", "webp", "mp4", "mov", "webm", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]) {
    assert.ok(getUploadFormat(`attachment.${extension}`));
  }
  for (const extension of ["zip", "svg", "docm", "xlsm", "pptm"]) {
    assert.equal(getUploadFormat(`attachment.${extension}`), undefined);
  }
});

test("enforces content, article, poll, and link boundaries", () => {
  assert.equal(postContentLimitError({ postType: "media", content: "a".repeat(5_000) }), undefined);
  assert.ok(postContentLimitError({ postType: "media", content: "a".repeat(5_001) }));
  assert.equal(postContentLimitError({ postType: "article", content: "a".repeat(20_000), title: "a".repeat(200) }), undefined);
  assert.ok(postContentLimitError({ postType: "article", content: "a".repeat(20_001) }));
  assert.ok(postContentLimitError({ postType: "media", links: Array(6) }));
  assert.equal(postContentLimitError({ postType: "poll", title: "Question", pollOptions: ["one", "two"], pollDuration: 14 }), undefined);
  assert.ok(postContentLimitError({ postType: "poll", pollOptions: ["one"], pollDuration: 1 }));
  assert.ok(postContentLimitError({ postType: "poll", pollOptions: ["one", "two"], pollDuration: 15 }));
});

test("uses rolling minute and day post quotas", () => {
  const now = new Date("2026-09-11T00:00:00Z");
  const minute = Array.from({ length: 5 }, () => new Date(now.getTime() - 1_000));
  assert.throws(() => consumePostQuota(minute, now), PostLimitError);
  const day = Array.from({ length: 50 }, () => new Date(now.getTime() - 61_000));
  assert.throws(() => consumePostQuota(day, now), PostLimitError);
  assert.equal(consumePostQuota(Array.from({ length: 5 }, () => new Date(now.getTime() - 60_000)), now).length, 6);
});
