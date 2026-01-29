"use client";

import { X, Mail, Phone, Lock } from "lucide-react";
import type User from "@/types/User";

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
  isOwner: boolean;
};

const EveryoneIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path
      fillRule="evenodd"
      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
      clipRule="evenodd"
    />
  </svg>
);

export default function ContactInfoModal({
  open,
  onClose,
  user,
  isOwner,
}: Props) {
  if (!open) return null;

  const canSeeEmail = isOwner || user.emailPublic === true;
  const canSeePhone = isOwner || user.phonePublic === true;

  const email = canSeeEmail ? (user.email ?? "").trim() : "";
  const phone = canSeePhone ? (user.phoneNo ?? "").trim() : "";

  const hasAny = !!email || !!phone;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <div className="text-xl font-semibold text-gray-900">
              {user.username}
            </div>
            <div className="text-sm text-gray-600">Contact info</div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-900"
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {!hasAny ? (
            <div className="text-sm text-gray-600">
              No contact info of this user yet.
            </div>
          ) : (
            <>
              {/* EMAIL */}
              {email && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="text-gray-700 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Email
                      </div>
                      <div className="text-sm text-blue-600 break-all">
                        {email}
                      </div>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    {user.emailPublic ? (
                      <>
                        <EveryoneIcon />
                        <span>Everyone</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Only you</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* PHONE */}
              {phone && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gray-700 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Phone
                      </div>
                      <div className="text-sm text-gray-700 break-all">
                        {phone}
                      </div>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    {user.phonePublic ? (
                      <>
                        <EveryoneIcon />
                        <span>Everyone</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Only you</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
