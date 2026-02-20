"use client";
import {
  useApplicants,
  useCloseJobPost,
  useJobPost,
  useReopenJobPost,
} from "../(main)/profile/utils/jobPostFetchFunctions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Search, MapPin } from "lucide-react";
import { JOB_APPLICATION_DETAIL_PAGE_PATH } from "@/lib/constants";

const STATUS_STYLES = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function ApplicantsPageClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { data: jobPost } = useJobPost(postId);
  const { data, isLoading } = useApplicants(postId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const closeJobMutation = useCloseJobPost();
  const reopenJobMutation = useReopenJobPost();

  const filtered =
    data?.filter((app) => {
      const matchesSearch =
        app.applicant.username.toLowerCase().includes(search.toLowerCase()) ||
        app.applicant.email.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "ALL" || app.status === filter;
      return matchesSearch && matchesFilter;
    }) || [];

  const handleCloseJob = () => {
    console.log("Close job clicked");
    closeJobMutation.mutate(postId);
  };

  const handleReopenJob = () => {
    reopenJobMutation.mutate(postId);
  };

  if (!jobPost) return;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="cursor-pointer inline-flex items-center gap-2 mb-6 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {jobPost.title}
              </h2>

              <div className="flex items-center gap-3 mt-2">
                {/* Status badge */}
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    jobPost.status === "OPEN"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {jobPost.status}
                </span>

                {/* Applicants count */}
                <span className="text-sm text-gray-500">
                  {data?.length ?? 0} applicants
                </span>
              </div>
            </div>

            {/* Right side buttons */}
            <div>
              {jobPost.status === "OPEN" && (
                <button
                  onClick={handleCloseJob}
                  className="cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Close Job
                </button>
              )}

              {jobPost.status === "CLOSED" && (
                <button
                  onClick={handleReopenJob}
                  disabled={reopenJobMutation.isPending}
                  className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {reopenJobMutation.isPending ? "Reopening..." : "Reopen Job"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 bg-linear-to-r from-gray-50 to-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Applicants</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and review job applications
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <span className="text-2xl font-bold text-gray-900">
                  {filtered.length}
                </span>
                <span className="text-sm text-gray-500">
                  {filtered.length === 1 ? "applicant" : "applicants"}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="text-neutral-600 px-8 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="APPLIED">Applied</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applicants List */}
          <div className="px-8 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-sm text-gray-500">Loading applicants...</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No applicants found
                </h3>
                <p className="text-sm text-gray-500">
                  {search || filter !== "ALL"
                    ? "Try adjusting your search or filters"
                    : "No applications have been submitted yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((application) => (
                  <div
                    key={application.id}
                    onClick={() =>
                      router.push(
                        JOB_APPLICATION_DETAIL_PAGE_PATH(
                          postId,
                          application.id,
                        ),
                      )
                    }
                    className="group relative border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative">
                        <img
                          src={
                            application.applicant.profilePic ||
                            "/default-avatar.png"
                          }
                          alt={application.applicant.username}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-gray-200 transition"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-base truncate">
                            {application.applicant.username}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-1 truncate">
                          {application.applicant.email}
                        </p>
                        {application.applicant.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {application.applicant.location}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          STATUS_STYLES[
                            application.status as keyof typeof STATUS_STYLES
                          ] || "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {application.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
