"use client";

import { useEffect, useState } from "react";
import { updateMyProfile } from "../[slug]/hook/updateMyProfile";
import type User from "@/types/User";

interface EditProfileModalProps {
    open: boolean;
    onClose: () => void;
    user: User;
}

export default function EditProfileModal({ open, onClose, user }: EditProfileModalProps) {
    // Form State
    const [form, setForm] = useState({
        originalUsername: user.username || "",
        newUsername: user.username || "",
        title: user.title || "",
        about: user.about || "",
        location: user.location || "",
        phoneNo: user.phoneNo || "",
        phonePublic: user.phonePublic ?? false,
        emailPublic: user.emailPublic ?? true,
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Reset form with fresh user data when modal opens
    useEffect(() => {
        if (open) {
            setForm({
                originalUsername: user.username || "",
                newUsername: user.username || "",
                title: user.title || "",
                about: user.about || "",
                location: user.location || "",
                phoneNo: user.phoneNo || "",
                phonePublic: user.phonePublic ?? false,
                emailPublic: user.emailPublic ?? true,
            });
        }
    }, [open, user]);

    if (!open) return null;

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;

        if (name === "newUsername") {
            // Prevent leading space only
            if (value.startsWith(" ")) return;

            // Allow empty typing — do NOT auto-restore
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

        // Block empty username
        if (!finalUsername) {
            setError("Username cannot be empty.");
            setSaving(false);
            return;
        }

        try {
            await updateMyProfile({
                username: finalUsername,
                title: form.title,
                about: form.about,
                location: form.location,
                phoneNo: form.phoneNo,
                phonePublic: form.phonePublic,
                emailPublic: form.emailPublic,
            });

            onClose();
            window.location.reload();
        } catch (err: any) {
            setError(err.message || "Failed to update profile");
        }

        setSaving(false);
    };


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
                       text-gray-900 placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500"
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
                       text-gray-900 placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500"
                    />
                </label>

                {/* ABOUT */}
                <label className="block mb-3">
                    <span className="text-gray-900 text-sm font-medium">About</span>
                    <textarea
                        name="about"
                        value={form.about}
                        onChange={handleChange}
                        placeholder="Tell people about yourself"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg 
                       text-gray-900 placeholder-gray-500
                       h-24 resize-none focus:ring-2 focus:ring-blue-500"
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
                       text-gray-900 placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500"
                    />
                </label>

                {/* PHONE NUMBER */}
                <label className="block mb-3">
                    <span className="text-gray-900 text-sm font-medium">Phone Number</span>
                    <input
                        name="phoneNo"
                        value={form.phoneNo}
                        onChange={handleChange}
                        placeholder="Your phone number"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg
                       text-gray-900 placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500"
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
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 
                       hover:bg-gray-100 font-medium"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium 
                       hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>

            </div>
        </div>
    );
}
