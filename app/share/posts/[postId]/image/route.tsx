import { ImageResponse } from "next/og";
import {
  buildBlobReadSasUrl,
  firstImageBlobName,
  getPublicPostPreview,
} from "@/lib/postHelpers";
import {
  PUBLIC_IMAGE_HEADERS,
  verifiedPublicRasterResponse,
} from "@/lib/server/publicPostImage";

// Azure SAS signing needs the Node runtime (not edge).
export const runtime = "nodejs";
// Regenerate at most hourly; social crawlers refetch this stable URL.
export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };

/** Branded fallback card for text-only posts (or when the photo is missing). */
function brandedCard(username: string | null, text: string) {
  const snippet =
    text.replace(/\s+/g, " ").trim().slice(0, 160) || "See this post on AU Connect.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.9 }}>
          au connect
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {username ? (
            <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.85 }}>
              {username}
            </div>
          ) : null}
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2 }}>
            {snippet}
          </div>
        </div>
        <div style={{ fontSize: 28, opacity: 0.8 }}>
          Sign in to view the full post
        </div>
      </div>
    ),
    { ...SIZE, headers: PUBLIC_IMAGE_HEADERS },
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const post = await getPublicPostPreview(postId);

  if (!post) {
    return brandedCard(null, "Post not found");
  }

  const blobName = firstImageBlobName(post.media);

  // Post has a photo or video thumbnail → serve it through this stable URL so the
  // cached social card never breaks when the underlying SAS token expires.
  if (blobName) {
    try {
      const upstream = await fetch(buildBlobReadSasUrl(blobName));
      const verifiedResponse = await verifiedPublicRasterResponse(upstream);
      if (verifiedResponse) return verifiedResponse;
    } catch {
      // fall through to the branded card
    }
  }

  return brandedCard(post.username, post.content);
}
