"use client";

import { useState, useRef } from "react";

export default function ApplyJobPostModal({
  isOpen,
  onClose,
  jobTitle,
  companyName,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName?: string;
  onSubmit: (data: {
    resumeFile: File;
    resumeLetter?: string;
    expectedSalary?: number;
    availability?: string;
  }) => Promise<void> | void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLetter, setResumeLetter] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availability, setAvailability] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const maxSize = 5 * 1024 * 1024;

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF or DOC/DOCX files allowed");
      return;
    }

    if (file.size > maxSize) {
      alert("File must be under 5MB");
      return;
    }

    setResumeFile(file);
  };

  const handleSubmit = async () => {
    console.log("Submit clicked");

    if (!resumeFile) {
      alert("Please upload your resume");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Calling onSubmit");

      await onSubmit({
        resumeFile,
        resumeLetter: resumeLetter || undefined,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        availability: availability || undefined,
      });
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full border border-blue-400 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-black">
            Apply for {jobTitle}
          </h2>

          {companyName && (
            <p className="text-sm text-neutral-600">{companyName}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Resume / CV *
            </label>

            {!resumeFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-blue-400 rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50 transition"
              >
                <p className="text-sm text-black">
                  Click to upload your resume
                </p>

                <p className="text-xs text-neutral-600 mt-1">
                  PDF, DOC, DOCX (Max 5MB)
                </p>
              </div>
            ) : (
              <div className="border border-blue-400 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-black">
                    {resumeFile.name}
                  </p>

                  <p className="text-xs text-neutral-600">
                    {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <button
                  onClick={() => setResumeFile(null)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>

          {/* Expected Salary */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Expected Salary
            </label>

            <input
              type="number"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
              placeholder="e.g. 50000"
              className={inputClass}
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Availability
            </label>

            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. Immediately, 2 weeks, 1 month"
              className={inputClass}
            />
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Cover Letter
            </label>

            <textarea
              rows={5}
              value={resumeLetter}
              onChange={(e) => setResumeLetter(e.target.value)}
              placeholder="Write a cover letter (optional)"
              className={inputClass + " resize-none"}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer px-4 py-2 rounded-lg border border-blue-500 text-blue-600 text-sm hover:bg-blue-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="cursor-pointer px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
