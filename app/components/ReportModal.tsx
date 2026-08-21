"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, X } from "lucide-react";
import { ReportTargetSnapshot } from "@/types/ReportTargetSnapshot";
import { ReportSubmitPayload } from "@/types/ReportSubmitPayload";
import { ReportReason } from "@/types/Report";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  target: ReportTargetSnapshot;
  onSubmit: (payload: ReportSubmitPayload) => Promise<void> | void;
};

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "VIOLENCE", label: "Violence" },
  { value: "NUDITY", label: "Nudity" },
  { value: "SCAM", label: "Scam" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "FAKE_ACCOUNT", label: "Fake account" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
];

export default function ReportModal({
  isOpen,
  onClose,
  target,
  onSubmit,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDescription("");
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const targetType = target.type ?? "USER";
  const targetName = target.username || "this user";
  const targetLabel = targetType === "USER" ? "user" : "post";
  const resolvedProfilePicUrl = useResolvedMediaUrl(target.profilePic);

  const payload = useMemo<ReportSubmitPayload | null>(() => {
    if (!reason) return null;

    return {
      targetType,
      targetId: target.id,
      reason,
      description: description.trim() || undefined,
    };
  }, [description, reason, target, targetType]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!payload) {
      setError("Choose a reason for the report.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Report submit error:", err);
      setError("Could not submit the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Report {targetLabel}
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Tell us what is wrong with {targetName}.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close report modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-3">
              <Image
                src={resolvedProfilePicUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded-full object-cover"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {targetName}
                </p>
                {target.title && (
                  <p className="truncate text-xs text-gray-500">
                    {target.title}
                  </p>
                )}
              </div>
            </div>

            {target.content && (
              <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                {target.content}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-900">
              Reason *
            </legend>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    reason === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="report-description"
              className="mb-1 block text-sm font-medium text-gray-900"
            >
              Details
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Add any details that can help review this report."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-1 flex justify-between gap-3 text-xs text-gray-500">
              <span>Optional</span>
              <span>{description.length}/1000</span>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}
