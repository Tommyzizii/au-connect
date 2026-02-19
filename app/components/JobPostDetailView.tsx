"use client";

import { AlertTriangle } from "lucide-react";
import parseDate from "../profile/utils/parseDate";
import JobDraft from "@/types/JobDraft";
import { useEffect } from "react";

interface JobPostContentViewProps {
  jobData: JobDraft;
  applicantCount?: number;
  hasApplied?: boolean;
  applicationStatus?: "APPLIED" | "SHORTLISTED" | "REJECTED" | null;
  isSaved?: boolean;
  isOwner: boolean;
  onApply?: () => void;
  onSave?: () => void;
  onViewApplicants?: () => void;
}


const employmentTypeLabels = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

const locationTypeLabels = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

const statusColors = {
  OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-neutral-100 text-neutral-600 border-neutral-200",
  FILLED: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function JobPostDetailView({
  jobData,
  applicantCount = 0,
  hasApplied = false,
  applicationStatus,
  isSaved = false,
  isOwner,
  onApply,
  onSave,
  onViewApplicants,
}: JobPostContentViewProps) {
useEffect(() => {
  console.log("jobData:\n", jobData);
}, [jobData])
  const formatSalary = () => {
    const currency = jobData.salaryCurrency || "USD";
    if (jobData.salaryMin && jobData.salaryMax) {
      return `${currency} ${jobData.salaryMin.toLocaleString()} - ${jobData.salaryMax.toLocaleString()}`;
    }
    if (jobData.salaryMin) {
      return `${currency} ${jobData.salaryMin.toLocaleString()}+`;
    }
    return null;
  };

  const salary = formatSalary();
  const now = new Date();
  const isDeadlinePassed = jobData.deadline && new Date(jobData.deadline) < now;
  const displayStatus =
    jobData.status === "OPEN" && isDeadlinePassed ? "CLOSED" : jobData.status;
  const requirements = jobData.jobRequirements || [];

  return (
    <div className="flex flex-col bg-neutral-50 pt-5 px-10 w-full h-full overflow-hidden">
      {/* Scroll Area - FIXED: Added min-h-0 and flex-1 for Safari */}
      <div className="overflow-y-auto h-full min-h-0 flex-1 hide-scrollbar">
        <div className="w-full max-w-full pt-10 space-y-12">
          {/* 🔹 HEADER */}
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-neutral-900 leading-tight">
                  {jobData.jobTitle}
                </h1>

                {jobData.companyName && (
                  <p className="text-neutral-600 text-lg">
                    {jobData.companyName}
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full border ${
                  statusColors[displayStatus]
                }`}
              >
                {displayStatus}
              </span>
            </div>

            <div className="h-px bg-neutral-200" />

            {/* METADATA GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
              {jobData.location && (
                <div className="space-y-1 mb-2">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Location
                  </span>
                  <p className="text-neutral-900 font-medium">
                    {jobData.location}
                  </p>
                </div>
              )}

              {jobData.locationType && (
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Location Type
                  </span>
                  <p className="text-neutral-900 font-medium">
                    {locationTypeLabels[jobData.locationType]}
                  </p>
                </div>
              )}

              {jobData.employmentType && (
                <div className="space-y-1 mb-2">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Employment Type
                  </span>
                  <p className="text-neutral-900 font-medium">
                    {employmentTypeLabels[jobData.employmentType]}
                  </p>
                </div>
              )}

              {jobData.positionsAvailable != null && (
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Positions
                  </span>

                  <p className="text-neutral-900 font-medium">
                    {jobData.positionsAvailable} total
                    {typeof jobData.positionsFilled === "number" && (
                      <> • {jobData.positionsFilled} filled</>
                    )}
                    {typeof jobData.remainingPositions === "number" && (
                      <> • {jobData.remainingPositions} remaining</>
                    )}
                  </p>
                </div>
              )}

              {salary && (
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Salary Range
                  </span>
                  <p className="text-neutral-600 font-medium">{salary}</p>
                </div>
              )}

              {jobData.deadline && (
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-neutral-400">
                    Application Deadline
                  </span>
                  <p className="text-neutral-900 font-medium">
                    {parseDate(jobData.deadline)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CONTENT CARD */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 space-y-10 mb-5 mt-5">
            {jobData.jobDetails && (
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                  About this Job
                </h2>
                <p className="min-w-0 wrap-break-word whitespace-pre-wrap text-neutral-700 leading-relaxed">
                  {jobData.jobDetails}
                </p>{" "}
              </div>
            )}

            {requirements.length > 0 && (
              <div className="mt-4 space-y-4">
                <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                  Skill Requirements
                </h2>

                <div className="flex flex-wrap gap-3">
                  {requirements.map((req, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-800 text-sm rounded-lg"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* External Link Warning */}
          {!isOwner && jobData.applyUrl && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    External Application
                  </p>
                  <p className="text-sm text-amber-800 mb-2">
                    This job application will redirect you to an external
                    website. Please verify the URL before proceeding.
                  </p>
                  <div className="bg-white rounded px-3 py-2 border border-amber-300">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                      Application URL
                    </p>
                    <p className="text-sm text-neutral-900 font-mono break-all">
                      {jobData.applyUrl}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-row mt-6 mb-5">
            <button
              disabled={isSaved}
              onClick={onSave}
              className="mr-3 cursor-pointer hover:bg-gray-800 bg-black rounded-lg ml-5 py-2 px-6 text-white"
            >
              {isSaved ? "Saved" : "Save"}
            </button>

            {isOwner ? (
              <button
                onClick={onViewApplicants}
                className="cursor-pointer rounded-lg bg-white hover:bg-neutral-100 py-2 px-4 text-neutral-800 border border-neutral-400"
              >
                View Applicants
              </button>
            ) : (
              <button
                disabled={hasApplied}
                onClick={onApply}
                className="cursor-pointer rounded-lg bg-blue-600 py-2 px-4 text-white disabled:bg-neutral-400"
              >
                {applicationStatus === "SHORTLISTED"
                  ? "Shortlisted"
                  : applicationStatus === "REJECTED"
                    ? "Rejected"
                    : applicationStatus === "APPLIED"
                      ? "Applied"
                      : "Apply"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
