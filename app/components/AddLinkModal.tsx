"use client";

import { useState } from "react";
import { X, Link as LinkIcon, Loader2 } from "lucide-react";
import { useFetchLinkPreview } from "@/app/(main)/profile/utils/fetchfunctions";

type AddLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (linkData: {
    url: string;
    title: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  }) => void;
};

export default function AddLinkModal({
  isOpen,
  onClose,
  onAdd,
}: AddLinkModalProps) {
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const fetchPreview = useFetchLinkPreview();

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setLinkUrl(value);
    setUrlError("");
  };

  const handleAdd = async () => {
    // Validate URL
    if (!linkUrl.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    if (!validateUrl(linkUrl)) {
      setUrlError(
        "Please enter a valid URL (must start with http:// or https://)",
      );
      return;
    }

    if (!linkTitle.trim()) {
      setUrlError("Please enter a title for the link");
      return;
    }

    // Fetch metadata from backend
    try {
      const metadata = await fetchPreview.mutateAsync(linkUrl.trim());

      // Add the link with fetched metadata
      onAdd({
        url: linkUrl.trim(),
        title: linkTitle.trim(),
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        favicon: metadata.favicon,
      });

      // Reset and close
      setLinkTitle("");
      setLinkUrl("");
      setUrlError("");
      onClose();
    } catch (error) {
      console.error("Failed to fetch link metadata:", error);

      // Still add the link without metadata if fetch fails
      onAdd({
        url: linkUrl.trim(),
        title: linkTitle.trim(),
      });

      // Reset and close
      setLinkTitle("");
      setLinkUrl("");
      setUrlError("");
      onClose();
    }
  };

  const handleClose = () => {
    setLinkTitle("");
    setLinkUrl("");
    setUrlError("");
    fetchPreview.reset(); // Reset mutation state
    onClose();
  };

  if (!isOpen) return null;

  const isLoading = fetchPreview.isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <LinkIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Add Link</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Link Name/Title */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Link Name
            </label>
            <input
              type="text"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="e.g., My Portfolio, Check this out..."
              disabled={isLoading}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl text-gray-900 placeholder-neutral-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition disabled:opacity-50 disabled:bg-neutral-50"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Give your link a descriptive name
            </p>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              URL
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-neutral-400 outline-none transition disabled:opacity-50 disabled:bg-neutral-50 ${
                urlError
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              }`}
            />
            {urlError && (
              <p className="mt-1.5 text-xs text-red-600">{urlError}</p>
            )}
            {!urlError && (
              <p className="mt-1.5 text-xs text-neutral-500">
                Must start with http:// or https://
              </p>
            )}
          </div>

          {/* Error Message */}
          {fetchPreview.isError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ Couldn't fetch preview, but your link will still be added
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!linkTitle.trim() || !linkUrl.trim() || isLoading}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition ${
              !linkTitle.trim() || !linkUrl.trim() || isLoading
                ? "bg-neutral-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching preview...
              </span>
            ) : (
              "Add Link"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
