"use client";

import { useRouter } from "next/navigation";
import {
  useApplicationDetail,
  useUpdateApplicationStatus,
} from "../(main)/profile/utils/jobPostFetchFunctions";
import {
  ArrowLeft,
  Download,
  Mail,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";

const STATUS_STYLES = {
  APPLIED: "bg-blue-50 text-blue-700 border-blue-200",
  SHORTLISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function ApplicantDetailClient({
  postId,
  applicationId,
}: {
  postId: string;
  applicationId: string;
}) {
  const router = useRouter();
  const { data: application, isLoading } = useApplicationDetail(
    postId,
    applicationId,
  );
  const updateStatus = useUpdateApplicationStatus();


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Application not found
          </h2>
          <button
            onClick={() => router.back()}
            className="cursor-pointer text-blue-600 hover:text-blue-700"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const applicant = application.applicant;

  const handleStatusChange = async (
    status: "APPLIED" | "SHORTLISTED" | "REJECTED",
  ) => {
    await updateStatus.mutateAsync({ postId, applicationId, status });
  };

  const handleDownload = () => {
    window.open(application.resumeUrl, "_blank");
  };

  const handleMessage = () => {
    router.push(`/messages?userId=${applicant.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="cursor-pointer inline-flex items-center gap-2 mb-6 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Applicant Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review application and take action
          </p>
        </div>

        <div className="space-y-6">
          {/* SECTION 1: Applicant Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              {/* Profile Picture */}
              <div className="relative">
                <img
                  src={applicant.profilePic || "/default_profile.jpg"}
                  alt={applicant.username}
                  onError={(e) => {
                    e.currentTarget.src = "/default_profile.jpg";
                  }}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {applicant.username}
                </h2>
                {applicant.title && (
                  <p className="text-gray-700 font-medium mb-2">
                    {applicant.title}
                  </p>
                )}
                <div className="space-y-1.5">
                  {applicant.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {applicant.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {applicant.email}
                  </div>
                  {applicant.phonePublic && applicant.phoneNo && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {applicant.phoneNo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Application Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Application Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Status
                </div>
                <span
                  className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                    STATUS_STYLES[
                      application.status as keyof typeof STATUS_STYLES
                    ]
                  }`}
                >
                  {application.status}
                </span>
              </div>

              {application.expectedSalary && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Expected Salary
                  </div>
                  <div className="flex items-center gap-1 text-gray-900 font-medium">
                    <DollarSign className="w-4 h-4" />
                    {application.expectedSalary.toLocaleString()}
                  </div>
                </div>
              )}

              {application.availability && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Availability
                  </div>
                  <div className="flex items-center gap-1 text-gray-900 font-medium">
                    <Clock className="w-4 h-4" />
                    {application.availability}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Applied Date
                </div>
                <div className="flex items-center gap-1 text-gray-900 font-medium">
                  <Calendar className="w-4 h-4" />
                  {new Date(application.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Cover Letter Card */}
          {application.resumeLetter && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cover Letter
              </h3>
              <div className="max-h-[300px] overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {application.resumeLetter}
                </p>
              </div>
            </div>
          )}

          {/* SECTION 4: Resume Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-sm font-medium transition"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>

            {/* PDF Preview */}
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <iframe
                src={application.resumeUrl}
                className="w-full h-[800px]"
                title="Resume Preview"
              />
            </div>
          </div>

          {/* SECTION 5: Action Buttons Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleMessage}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition"
              >
                Message Applicant
              </button>

              {application.status !== "SHORTLISTED" && (
                <button
                  onClick={() => handleStatusChange("SHORTLISTED")}
                  disabled={updateStatus.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {updateStatus.isPending ? "Updating..." : "Shortlist"}
                </button>
              )}

              {application.status !== "REJECTED" && (
                <button
                  onClick={() => handleStatusChange("REJECTED")}
                  disabled={updateStatus.isPending}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {updateStatus.isPending ? "Updating..." : "Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}