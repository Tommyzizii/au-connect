"use client";

import { useQuery } from "@tanstack/react-query";

const DEFAULT_FALLBACK = "/default_profile.jpg";

function isHttpUrl(v: string) {
  return v.startsWith("http://") || v.startsWith("https://");
}

function isLocalPath(v: string) {
  return v.startsWith("/");
}

/**
 * Resolves a profilePic value into something safe for next/image:
 * - "/..." -> return as-is
 * - "http(s)://..." -> return as-is
 * - otherwise treat as Azure blobName and fetch signed URL via /fetch-media
 *
 * Uses react-query caching so the same blobName isn't fetched repeatedly.
 */
export function useResolvedMediaUrl(
  value: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
) {
  const raw = (value ?? "").trim();

  // Determine if we can use the value immediately without fetching
  const immediate =
    !raw ? fallback : isLocalPath(raw) || isHttpUrl(raw) ? raw : null;

  const shouldFetch = immediate === null && raw !== "";

  const { data, error } = useQuery({
    queryKey: ["media-url", raw],
    enabled: shouldFetch,
    queryFn: async () => {
      try {
        const res = await fetch(
          `/api/connect/v1/fetch-media?blobName=${encodeURIComponent(raw)}`
        );
        const json = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch media URL:", json?.error);
          throw new Error(json?.error || "Failed to fetch media url");
        }
        return json?.url as string;
      } catch (err) {
        console.error("Error fetching media URL for:", raw, err);
        throw err;
      }
    },
    staleTime: 8 * 60 * 1000, // 8 min (SAS is 10 min)
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  // If there was an error fetching, return fallback
  if (error) {
    console.warn("Using fallback due to error:", error);
    return fallback;
  }

  return immediate ?? data ?? fallback;
}