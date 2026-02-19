import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import PopupModal from "./PopupModal";
import JobDraft from "@/types/JobDraft";

type LocationType = "ONSITE" | "REMOTE" | "HYBRID";
type EmploymentType = "FULL_TIME" | "PART_TIME" | "FREELANCE" | "INTERNSHIP";

interface JobPostCardProps {
  post: any;
  job: JobDraft;
  isOwner: boolean;
  hasApplied: boolean;
  applicationStatus: "APPLIED" | "SHORTLISTED" | "REJECTED";
  isSaved: boolean;
  postMenuDropDownOpen: boolean;
  setPostMenuDropDownOpen: (state: boolean) => void;
  popupOpen: boolean;
  setPopupOpen: (state: boolean) => void;
  onTitleClick: () => void;
  onEdit?: () => void;
  onDelete?: (postId: string) => void;
  onApply: () => void;
  onSaveToggle: () => void;
  onViewApplicants?: () => void;
}

const formatEmployment = (type?: EmploymentType) =>
  type
    ?.replace("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

const formatLocationType = (type?: LocationType) =>
  type?.charAt(0) + type?.slice(1).toLowerCase();

const formatSalary = (job: any) => {
  if (!job.salaryMin && !job.salaryMax) return null;
  const currency = job.salaryCurrency || "USD";

  if (job.salaryMin && job.salaryMax) {
    return `${currency} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`;
  }

  if (job.salaryMin) {
    return `${currency} ${job.salaryMin.toLocaleString()}+`;
  }

  return null;
};

const statusColors = {
  OPEN: "text-green-600 border-green-600",
  CLOSED: "text-gray-500 border-gray-500",
  FILLED: "text-blue-600 border-blue-600",
};

export const JobPostCard: React.FC<JobPostCardProps> = ({
  post,
  job,
  isOwner,
  hasApplied,
  isSaved,
  postMenuDropDownOpen,
  setPostMenuDropDownOpen,
  popupOpen,
  setPopupOpen,
  onTitleClick,
  onEdit,
  onDelete,
  onApply,
  onSaveToggle,
  onViewApplicants,
}) => {
  const salary = formatSalary(job);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [externalConfirm, setExternalConfirm] = useState(false);

  const now = new Date();

  const isDeadlinePassed = job.deadline && new Date(job.deadline) < now;

  const displayStatus =
    job.status === "OPEN" && isDeadlinePassed ? "CLOSED" : job.status;

  const handleEdit = () => {
    setPostMenuDropDownOpen(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setPostMenuDropDownOpen(false);
    setPopupOpen(true);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setPostMenuDropDownOpen(false);
      }
    }

    if (postMenuDropDownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [postMenuDropDownOpen]);

  return (
    <div className="p-6 pl-9">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <span className="font-semibold bg-gray-100 text-black px-2 py-1 rounded">
          JOB
        </span>

        {isOwner ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setPostMenuDropDownOpen(!postMenuDropDownOpen)}
              className="cursor-pointer p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <Ellipsis className="text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {postMenuDropDownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={handleEdit}
                  className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit post
                </button>
                <button
                  onClick={handleDelete}
                  className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete post
                </button>
              </div>
            )}
          </div>
        ) : (
          <span
            className={`text-sm font-semibold border py-1 px-3 rounded-xl ${statusColors[displayStatus]}`}
          >
            {displayStatus}
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        onClick={onTitleClick}
        className="cursor-pointer hover:underline text-xl font-semibold text-black"
      >
        {job.jobTitle}
      </h2>

      {/* Company */}
      {job.companyName && (
        <p className="text-gray-800 mt-1 text-sm">{job.companyName}</p>
      )}

      {/* Meta */}
      <p className="text-gray-600 text-sm mt-1">
        {[job.location, formatLocationType(job.locationType)]
          .filter(Boolean)
          .join(" · ")}
        {job.employmentType && <> · {formatEmployment(job.employmentType)}</>}
      </p>

      {/* Description */}
      {post.content && (
        <p className="text-gray-700 mt-4 text-sm line-clamp-2">
          {post.content}
        </p>
      )}

      {/* Salary + Deadline */}
      <div className="flex gap-8 mt-4 text-sm text-gray-800">
        {salary && <span>{salary}</span>}
        {job.deadline && (
          <span>Apply by {new Date(job.deadline).toLocaleDateString()}</span>
        )}
      </div>

      {/* Positions Available (Owner View) */}
      {isOwner && job.positionsAvailable && (
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
          <span>
            {job.positionsFilled || 0} / {job.positionsAvailable} positions
            filled
          </span>
          {job.remainingPositions !== undefined &&
            job.remainingPositions <= 2 &&
            job.remainingPositions > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                {job.remainingPositions} left
              </span>
            )}
          {job.remainingPositions === 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
              All filled
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {isOwner ? (
          <button
            onClick={onViewApplicants}
            className="cursor-pointer bg-black text-white px-5 py-2 rounded-lg text-sm hover:opacity-90 transition"
          >
            View Applicants
          </button>
        ) : (
          <button
            onClick={() => {
              if (job.allowExternalApply && job.applyUrl) {
                setExternalConfirm(true);
                setPopupOpen(true);
              } else {
                onApply();
              }
            }}
            disabled={hasApplied}
            className={`cursor-pointer px-5 py-2 rounded-lg text-sm transition ${
              hasApplied
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:opacity-90"
            }`}
          >
            {hasApplied ? "Applied" : "Apply"}
          </button>
        )}

        <button
          onClick={onSaveToggle}
          className={`cursor-pointer px-5 py-2 rounded-lg text-black text-sm border transition ${
            isSaved
              ? "bg-gray-100 border-gray-300"
              : "bg-white border-gray-300 hover:bg-gray-50"
          }`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>

      {popupOpen && (
        <PopupModal
          title={
            externalConfirm
              ? "Are you sure you want to enter this link"
              : "Delete Post?"
          }
          titleText={
            externalConfirm
              ? `You are about to enter to this external link: ${job.applyUrl}`
              : "Are you sure you want to delete this post?"
          }
          actionText={externalConfirm ? "Enter" : "Delete"}
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          onConfirm={() => {
            if (externalConfirm) {
              window.open(job.applyUrl, "_blank", "noopener,noreferrer");
              setExternalConfirm(false);
            } else {
              setPopupOpen(false);
              onDelete?.(post.id);
            }
          }}
        />
      )}
    </div>
  );
};