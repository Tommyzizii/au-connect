"use client";

import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

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
            className="text-gray-400 hover:text-gray-600 cursor-pointer hover:bg-gray-100 hover:rounded-full p-2"
          >
            <X className="w-5 h-5" />
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${
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
