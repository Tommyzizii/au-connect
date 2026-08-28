import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPostPreview } from "@/lib/postHelpers";
import {
  POST_DETAIL_PAGE_PATH,
  SHARE_POST_OG_IMAGE_PATH,
  SHARE_POST_PAGE_PATH,
} from "@/lib/constants";
import { NEXT_PUBLIC_BASE_URL } from "@/lib/env";

const SITE_NAME = "AU Connect";

/** Trim post text to a short, public-safe preview snippet. */
function snippet(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

type Params = { postId: string };
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPublicPostPreview(postId);

  if (!post) {
    return {
      title: `Post not found · ${SITE_NAME}`,
      robots: { index: false },
    };
  }

  const title = post.title?.trim() || `${post.username} on ${SITE_NAME}`;
  const description = snippet(post.content) || `See this post on ${SITE_NAME}.`;
  const imagePath = SHARE_POST_OG_IMAGE_PATH(postId);
  const pagePath = SHARE_POST_PAGE_PATH(postId);

  return {
    metadataBase: new URL(NEXT_PUBLIC_BASE_URL),
    title,
    description,
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      url: pagePath,
      title,
      description,
      images: [{ url: imagePath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

export default async function SharePostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { postId } = await params;
  const post = await getPublicPostPreview(postId);

  if (!post) {
    notFound();
  }

  // Humans land here from a shared link; funnel them into the real (authed) post.
  const openInAppHref = POST_DETAIL_PAGE_PATH(postId, 0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={SHARE_POST_OG_IMAGE_PATH(postId)}
          alt=""
          className="h-56 w-full bg-gray-100 object-cover"
        />
        <div className="p-6">
          <p className="text-sm font-medium text-gray-500">{SITE_NAME}</p>
          <h1 className="mt-1 text-lg font-semibold text-gray-900">
            {post.title?.trim() || `${post.username} shared a post`}
          </h1>
          <p className="mt-2 line-clamp-4 text-sm text-gray-600">
            {snippet(post.content, 220)}
          </p>

          <Link
            href={openInAppHref}
            className="mt-6 block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Open in {SITE_NAME}
          </Link>
          <p className="mt-3 text-center text-xs text-gray-400">
            Sign in to view the full post, comments, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
