import { POST_LIMITS } from "@/lib/postLimits";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

export const PUBLIC_IMAGE_HEADERS = {
  "cache-control": CACHE_CONTROL,
  "x-content-type-options": "nosniff",
} as const;

type SupportedRasterContentType = "image/jpeg" | "image/png" | "image/webp";

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Detect only the raster formats accepted by the post upload pipeline. */
export function detectSupportedRasterContentType(
  bytes: Uint8Array,
): SupportedRasterContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  return null;
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
): Promise<Uint8Array | null> {
  if (!response.body) return null;

  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength <= 0 || parsedLength > maximumBytes) {
      await response.body.cancel().catch(() => undefined);
      return null;
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  }

  if (totalBytes === 0) return null;
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Convert a successful Azure response into a same-origin raster response only
 * after checking its bytes. The Azure Content-Type is deliberately ignored.
 */
export async function verifiedPublicRasterResponse(
  upstream: Response,
): Promise<Response | null> {
  if (!upstream.ok) return null;

  const bytes = await readBoundedBody(upstream, POST_LIMITS.imageBytes);
  if (!bytes) return null;

  const contentType = detectSupportedRasterContentType(bytes);
  if (!contentType) return null;

  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      ...PUBLIC_IMAGE_HEADERS,
      "content-type": contentType,
      "content-length": String(bytes.byteLength),
    },
  });
}
