"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateMyProfile } from "../[slug]/hook/updateMyProfile";
import type User from "@/types/User";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User;

  // ProfileView updates without refresh
  onUserUpdated?: (u: User) => void;
}

export default function EditProfileModal({
  open,
  onClose,
  user,
  onUserUpdated,
}: EditProfileModalProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    originalUsername: user.username || "",
    newUsername: user.username || "",
    title: user.title || "",
    location: user.location || "",
    phoneNo: user.phoneNo || "",
    phonePublic: user.phonePublic ?? false,
    emailPublic: user.emailPublic ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        originalUsername: user.username || "",
        newUsername: user.username || "",
        title: user.title || "",
        location: user.location || "",
        phoneNo: user.phoneNo || "",
        phonePublic: user.phonePublic ?? false,
        emailPublic: user.emailPublic ?? true,
      });
      setError("");
    }
  }, [open, user]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (name === "newUsername") {
      if (value.startsWith(" ")) return;
      setForm((prev) => ({ ...prev, newUsername: value }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const finalUsername = form.newUsername.trim();
    if (!finalUsername) {
      setError("Username cannot be empty.");
      setSaving(false);
      return;
    }

    try {
      const updatedUser = await updateMyProfile({
        username: finalUsername,
        title: form.title,
        location: form.location,
        phoneNo: form.phoneNo,
        phonePublic: form.phonePublic,
        emailPublic: form.emailPublic,
      });

      // update react-query cache
      queryClient.setQueryData(["user"], (old: any) =>
        old ? { ...old, ...updatedUser } : updatedUser
      );

      // update ProfileView local state (no refresh)
      onUserUpdated?.(updatedUser);

      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  function formatThaiPhone(input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 10); // cap to 10 digits (TH no country code)
    if (!digits) return "";

    // If starts with 02 (Bangkok landline) often 9 digits: 02-xxx-xxxx
    if (digits.startsWith("02")) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
    }

    // Mobile / other: 0xx-xxx-xxxx (10 digits)
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }


  const readOnlyEmail = (user.email ?? "").trim();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 font-inter">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 border border-gray-200">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Edit Profile</h2>

        {error && <p className="text-red-600 text-sm mb-2 font-medium">{error}</p>}

        {/* USERNAME */}
        <label className="block mb-3">
          <span className="text-gray-900 text-sm font-medium">Username</span>
          <input
            name="newUsername"
            value={form.newUsername}
            onChange={handleChange}
            placeholder="Enter username"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg 
              text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* TITLE */}
        <label className="block mb-3">
          <span className="text-gray-900 text-sm font-medium">Title</span>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Your role / job title"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg
              text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* LOCATION */}
        <label className="block mb-3">
          <span className="text-gray-900 text-sm font-medium">Location</span>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Bangkok, Thailand"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg
              text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* EMAIL (READ ONLY) */}
        <div className="block mb-3">
          <span className="text-gray-900 text-sm font-medium">Email</span>
          <div className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
            {readOnlyEmail || "—"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Email is read-only (from your sign-in).
          </p>
        </div>

        {/* PHONE NUMBER */}
        <label className="block mb-3">
          <span className="text-gray-900 text-sm font-medium">Phone Number</span>
          <input
            type="tel"
            name="phoneNo"
            value={form.phoneNo}
            onChange={(e) => {
              const formatted = formatThaiPhone(e.target.value);
              setForm((prev) => ({ ...prev, phoneNo: formatted }));
            }}
            placeholder="091-234-5678"
            inputMode="numeric"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg
                      text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />


        </label>

        {/* CHECKBOXES */}
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            name="phonePublic"
            checked={form.phonePublic}
            onChange={handleChange}
          />
          <span className="text-sm text-gray-800">Make phone visible to others</span>
        </label>

        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            name="emailPublic"
            checked={form.emailPublic}
            onChange={handleChange}
          />
          <span className="text-sm text-gray-800">Show email on profile</span>
        </label>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
