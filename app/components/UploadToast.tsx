"use client";

import { useUploadStore } from "@/lib/stores/uploadStore";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export function UploadToast() {
  const jobs = useUploadStore((state) => state.jobs);
  const removeJob = useUploadStore((state) => state.removeJob);

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-white rounded-lg shadow-lg border border-neutral-200 p-4 w-80"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {job.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
              {job.status === "complete" && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {job.status === "error" && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-sm font-bold ${job.status === "complete" ? "text-green-600" : "text-black"}`}
              >
                {job.status === "uploading" && "Uploading post..."}
                {job.status === "complete" && "Post uploaded!"}
                {job.status === "error" && "Upload failed"}
              </span>
            </div>
            <button
              onClick={() => removeJob(job.id)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {job.status === "uploading" && (
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}

          {job.status === "error" && (
            <p className="text-xs text-red-600 mt-1">{job.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
