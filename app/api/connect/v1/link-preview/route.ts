import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function extractMetaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Support both property="..." and name="..." with flexible attribute order.
  const patterns = [
    new RegExp(
      `<meta[^>]*\\bproperty\\s*=\\s*["']${escaped}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\bproperty\\s*=\\s*["']${escaped}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*\\bname\\s*=\\s*["']${escaped}["'][^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*\\bcontent\\s*=\\s*["']([^"']+)["'][^>]*\\bname\\s*=\\s*["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function extractIconHref(html: string): string | null {
  const linkMatch = html.match(
    /<link[^>]*\brel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/i,
  );
  if (!linkMatch?.[0]) return null;

  const hrefMatch = linkMatch[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
  return hrefMatch?.[1]?.trim() || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL must use http or https protocol" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AUConnectBot/1.0; +https://auconnect.com)",
        },
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error("Failed to fetch URL:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
        },
        { status: 400 },
      );
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "URL does not return HTML content" },
        { status: 400 },
      );
    }

    const html = await response.text();

    // Extract metadata
    const title =
      extractMetaContent(html, "og:title") ||
      extractMetaContent(html, "twitter:title") ||
      extractTitle(html) ||
      null;

    const description =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "twitter:description") ||
      extractMetaContent(html, "description") ||
      null;

    let image =
      extractMetaContent(html, "og:image") ||
      extractMetaContent(html, "twitter:image") ||
      null;

    // Make image URL absolute if it's relative
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, parsedUrl.origin).href;
      } catch {
        console.warn("Failed to resolve relative image URL:", image);
        image = null;
      }
    }

    const siteName = extractMetaContent(html, "og:site_name") || parsedUrl.hostname;

    // Get favicon
    let favicon: string | null = null;
    const iconHref = extractIconHref(html);
    if (iconHref) {
      try {
        favicon = iconHref.startsWith("http")
          ? iconHref
          : new URL(iconHref, parsedUrl.origin).href;
      } catch {
        console.warn("Failed to resolve favicon URL:", iconHref);
      }
    }

    // Fallback to default favicon
    if (!favicon) {
      favicon = `${parsedUrl.origin}/favicon.ico`;
    }

    const metadata = {
      title,
      description,
      image,
      siteName,
      favicon,
    };

    return NextResponse.json(metadata, { status: 200 });
  } catch (error) {
    console.error("Link preview error:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching link preview" },
      { status: 500 },
    );
  }
}
