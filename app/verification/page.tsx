"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, FileText, Upload, XCircle } from "lucide-react";

import {
  ACCOUNT_VERIFICATION_API_PATH,
  MAIN_PAGE_PATH,
  BASE_API_PATH,
} from "@/lib/constants";

type VerificationStatus = "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
type VerificationRole = "STUDENT" | "ALUMNI" | "STAFF" | "LECTURER";

type UploadedDocument = {
  blobName: string;
  name: string;
  mimetype: string;
  size: number;
};

type VerificationRequest = {
  id: string;
  role: VerificationRole;
  documentType: string;
  documents: UploadedDocument[];
  note?: string | null;
  status: VerificationStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
};

type VerificationState = {
  accountVerificationStatus: VerificationStatus;
  accountVerificationRole?: VerificationRole | null;
  verificationRequests: VerificationRequest[];
};

const roleOptions: { value: VerificationRole; label: string; hint: string }[] = [
  {
    value: "STUDENT",
    label: "Student",
    hint: "Student card, enrollment letter, or current student certificate",
  },
  {
    value: "ALUMNI",
    label: "Alumni",
    hint: "Graduation certificate, transcript, or alumni proof",
  },
  {
    value: "STAFF",
    label: "University staff",
    hint: "Staff ID, employment certificate, or official university letter",
  },
  {
    value: "LECTURER",
    label: "Lecturer",
    hint: "Lecturer ID, appointment letter, or faculty confirmation",
  },
];

const documentTypeByRole: Record<VerificationRole, string> = {
  STUDENT: "Student card",
  ALUMNI: "Graduation certificate",
  STAFF: "University staff proof",
  LECTURER: "Lecturer proof",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VerificationPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [state, setState] = useState<VerificationState | null>(null);
  const [role, setRole] = useState<VerificationRole>("STUDENT");
  const [documentType, setDocumentType] = useState(documentTypeByRole.STUDENT);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const latestRequest = state?.verificationRequests?.[0];
  const status = state?.accountVerificationStatus ?? "UNSUBMITTED";
  const selectedRole = roleOptions.find((item) => item.value === role);

  useEffect(() => {
    fetch(ACCOUNT_VERIFICATION_API_PATH, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load verification status");
        return res.json();
      })
      .then((data) => {
        setState(data);
        if (data.accountVerificationRole) {
          setRole(data.accountVerificationRole);
          setDocumentType(documentTypeByRole[data.accountVerificationRole as VerificationRole]);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRoleChange = (nextRole: VerificationRole) => {
    setRole(nextRole);
    setDocumentType(documentTypeByRole[nextRole]);
  };

  const uploadDocument = async (file: File): Promise<UploadedDocument> => {
    const res = await fetch(`${BASE_API_PATH}/upload-media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileType: file.type || "application/octet-stream",
        fileName: file.name,
        fileSize: file.size,
      }),
    });

    if (!res.ok) throw new Error(`Could not prepare upload for ${file.name}`);

    const { uploadUrl, blobName } = await res.json();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadRes.ok) throw new Error(`Could not upload ${file.name}`);

    return {
      blobName,
      name: file.name,
      mimetype: file.type || "application/octet-stream",
      size: file.size,
    };
  };

  const handleSubmit = async () => {
    if (!files.length || isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const documents = await Promise.all(files.map(uploadDocument));
      const res = await fetch(ACCOUNT_VERIFICATION_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role,
          documentType,
          note: note.trim() || undefined,
          documents,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not submit verification request");
      }

      const refreshed = await fetch(ACCOUNT_VERIFICATION_API_PATH, {
        credentials: "include",
        cache: "no-store",
      }).then((response) => response.json());

      setState(refreshed);
      setFiles([]);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-4xl text-gray-600">Loading verification...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
                Account Verification
              </p>
              <h1 className="mt-2 text-2xl font-bold text-neutral-950">
                Verify your AU Connect account
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                Upload proof that you are connected to Assumption University. You
                can skip this for now and keep reading posts, but posting,
                liking, commenting, sharing, messaging, friend requests, and job
                applications need approval.
              </p>
            </div>

            <button
              onClick={() => router.push(MAIN_PAGE_PATH)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {status === "APPROVED" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {status === "PENDING" && <Clock3 className="h-4 w-4 text-amber-600" />}
            {status === "REJECTED" && <XCircle className="h-4 w-4 text-red-600" />}
            {status === "UNSUBMITTED" && <FileText className="h-4 w-4 text-neutral-500" />}
            <span className="font-semibold">Current status:</span>
            <span>{status.replace("_", " ")}</span>
          </div>

          {latestRequest?.reviewNote && (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              Admin note: {latestRequest.reviewNote}
            </div>
          )}
        </section>

        {status !== "APPROVED" && (
          <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-950">
              {status === "REJECTED" ? "Submit updated documents" : "Submit documents"}
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {roleOptions.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleRoleChange(item.value)}
                  className={`rounded-lg border p-4 text-left transition ${
                    role === item.value
                      ? "border-red-400 bg-red-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="font-semibold text-neutral-900">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-neutral-500">{item.hint}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">
                  Document type
                </span>
                <input
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                  className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-400"
                />
              </label>

              <div>
                <span className="text-sm font-semibold text-neutral-700">
                  Suggested proof
                </span>
                <p className="mt-2 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                  {selectedRole?.hint}
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-neutral-700">
                Note to admin
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-red-400"
                placeholder="Optional context about the uploaded document"
              />
            </label>

            <div className="mt-5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? []);
                  setFiles(selectedFiles.slice(0, 5));
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Upload className="h-4 w-4" />
                Choose documents
              </button>
              <p className="mt-2 text-xs text-neutral-500">
                PDF, Word, or image files. Up to 5 files.
              </p>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm text-neutral-700"
                    >
                      <span>{file.name}</span>
                      <span className="text-xs text-neutral-500">{formatSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={!files.length || isSubmitting}
              onClick={handleSubmit}
              className="mt-5 rounded-md bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              {isSubmitting ? "Submitting..." : "Submit for review"}
            </button>
          </section>
        )}

        {state?.verificationRequests?.length ? (
          <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-950">History</h2>
            <div className="mt-4 space-y-3">
              {state.verificationRequests.map((request) => (
                <div key={request.id} className="rounded-md border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-neutral-900">
                      {request.role} - {request.documentType}
                    </div>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-neutral-500">
                    Submitted {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
