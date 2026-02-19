"use client";

import { X } from "lucide-react";

export default function PopupModal({
  title,
  titleText,
  actionText,
  open,
  onClose,
  onConfirm,
}: {
  title?: string;
  titleText?: string;
  actionText?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-999 px-4">
      <div className="bg-white rounded-xl shadow-lg max-w-sm p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {title ? title : "Unknown Title"}
        </h2>

        <p className="text-gray-600 text-sm mb-6">
          {titleText
            ? titleText
            : "Oops you've caught an error because this is not suppose to show"}
        </p>

        <div className="cursor-pointer flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="cursor-pointer px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
          >
            {actionText ? actionText : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
