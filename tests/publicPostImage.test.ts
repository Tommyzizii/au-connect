import assert from "node:assert/strict";
import test from "node:test";
import {
  detectSupportedRasterContentType,
  verifiedPublicRasterResponse,
} from "../lib/server/publicPostImage";
import { POST_LIMITS } from "../lib/postLimits";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const webp = new TextEncoder().encode("RIFF0000WEBPdata");
const svg = new TextEncoder().encode("<svg><script>alert(1)</script></svg>");

test("detects only supported raster signatures", () => {
  assert.equal(detectSupportedRasterContentType(jpeg), "image/jpeg");
  assert.equal(detectSupportedRasterContentType(png), "image/png");
  assert.equal(detectSupportedRasterContentType(webp), "image/webp");
  assert.equal(detectSupportedRasterContentType(svg), null);
  assert.equal(detectSupportedRasterContentType(new Uint8Array()), null);
});

test("serves verified raster bytes with authoritative security headers", async () => {
  for (const [bytes, expectedType] of [
    [jpeg, "image/jpeg"],
    [png, "image/png"],
    [webp, "image/webp"],
  ] as const) {
    const response = await verifiedPublicRasterResponse(
      new Response(bytes, { headers: { "content-type": "image/svg+xml" } }),
    );

    assert.ok(response);
    assert.equal(response.headers.get("content-type"), expectedType);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      response.headers.get("cache-control"),
      "public, max-age=3600, s-maxage=3600",
    );
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  }
});

test("rejects SVG, mislabeled non-images, and failed upstream responses", async () => {
  assert.equal(
    await verifiedPublicRasterResponse(
      new Response(svg, { headers: { "content-type": "image/svg+xml" } }),
    ),
    null,
  );
  assert.equal(
    await verifiedPublicRasterResponse(
      new Response("not an image", { headers: { "content-type": "image/png" } }),
    ),
    null,
  );
  assert.equal(
    await verifiedPublicRasterResponse(new Response(null, { status: 404 })),
    null,
  );
});

test("rejects empty and oversized image responses", async () => {
  assert.equal(await verifiedPublicRasterResponse(new Response()), null);
  assert.equal(
    await verifiedPublicRasterResponse(
      new Response(jpeg, {
        headers: { "content-length": String(POST_LIMITS.imageBytes + 1) },
      }),
    ),
    null,
  );

  const oversizedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(jpeg);
      controller.enqueue(new Uint8Array(POST_LIMITS.imageBytes));
      controller.close();
    },
  });
  assert.equal(
    await verifiedPublicRasterResponse(new Response(oversizedStream)),
    null,
  );
});
