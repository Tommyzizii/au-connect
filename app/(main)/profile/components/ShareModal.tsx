"use client";

import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

/** Open a platform share dialog in a small centered popup window. */
function openShareWindow(url: string) {
  const width = 600;
  const height = 640;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  window.open(
    url,
    "_blank",
    `width=${width},height=${height},left=${left},top=${top},noopener,noreferrer`,
  );
}

export default function ShareModal({
  isOpen,
  onClose,
  shareUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const encoded = encodeURIComponent(shareUrl);

  const shareFacebook = () =>
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`);

  const shareLinkedIn = () =>
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <h3 className="text-lg font-semibold text-gray-900">Share Post</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600  hover:bg-gray-100 hover:rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Share to social platforms */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={shareFacebook}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#166fe0] "
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>

          <button
            onClick={shareLinkedIn}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#095196] "
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>
        </div>

        {/* Link Display */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2  ${
              copied
                ? "bg-green-500 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Optional: Social share buttons could go here */}
        <p className="text-xs text-gray-500 text-center">
          Anyone with this link can view the post
        </p>
      </div>
    </div>
  );
}
