"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateAbout } from "../[slug]/hook/updateAbout"; 

export default function EditAboutModal({
  open,
  onClose,
  initialAbout,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialAbout: string;
  onSaved: (newAbout: string) => void;
}) {
  const [about, setAbout] = useState(initialAbout || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAbout(initialAbout || "");
      setError("");
      setSaving(false);
    }
  }, [open, initialAbout]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      await updateAbout(about); //  ONLY UPDATE ABOUT
      onSaved(about);           // update UI immediately
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update about");
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit about</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-3">
            You can write about your years of experience, industry, or skills.
            People also talk about their achievements or previous job experiences.
          </p>

          {error && (
            <p className="text-red-600 text-sm mb-3 font-medium">
              {error}
            </p>
          )}

          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="w-full min-h-[260px] border border-gray-300 rounded-lg p-3 
                       text-gray-900 placeholder-gray-500 
                       focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Tell people about yourself"
            maxLength={2600}
          />

          <div className="text-right text-xs text-gray-500 mt-2">
            {about.length}/2,600
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 
                       text-gray-700 hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg 
                       font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}
