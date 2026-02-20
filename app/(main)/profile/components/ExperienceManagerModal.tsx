"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import AddEditExperienceModal from "./AddEditExperienceModal";
import type Experience from "@/types/Experience";
import { ADD_EXPERIENCE_API_PATH, UPDATE_EXPERIENCE_API_PATH,DELETE_EXPERIENCE_API_PATH } from "@/lib/constants";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ExperienceManagerModal({
  open,
  onClose,
  experiences,
  setExperiences,
}: {
  open: boolean;
  onClose: () => void;
  experiences: Experience[];
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
}) {
  const [editing, setEditing] = useState<Experience | null>(null);
  const [openForm, setOpenForm] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-inter">
        <div className="bg-white w-full max-w-2xl rounded-xl overflow-hidden border border-gray-200 shadow-xl">

          {/* HEADER */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Experience
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditing(null);
                  setOpenForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer"
              >
                <Plus size={16} />
                Add experience
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="text-gray-600 hover:text-gray-800" />
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="p-6 space-y-3">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="border border-gray-200 rounded-lg p-4 flex justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900 truncate">
                    {exp.title}
                  </p>

                  <p className="text-sm text-gray-800">
                    {exp.company} · {exp.employmentType}
                  </p>

                  <p className="text-sm text-gray-600 mt-1">
                    {MONTHS[exp.startMonth]} {exp.startYear} –{" "}
                    {exp.isCurrent
                      ? "Present"
                      : `${MONTHS[exp.endMonth!]} ${exp.endYear}`}
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      setEditing(exp);
                      setOpenForm(true);
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    <Pencil size={16} className="text-gray-600" />
                  </button>

                  <button
                    onClick={async () => {
                      await fetch(
                        DELETE_EXPERIENCE_API_PATH + `/${exp.id}`,
                        {
                          method: "DELETE",
                          credentials: "include",
                        }
                      );

                      // updates ProfileView immediately
                      setExperiences((prev) =>
                        prev.filter((e) => e.id !== exp.id)
                      );
                    }}
                    className="p-2 rounded-full hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <AddEditExperienceModal
        open={openForm}
        initial={editing}
        onClose={() => setOpenForm(false)}
        onSave={async (data) => {
          if (editing) {
            const res = await fetch(
              UPDATE_EXPERIENCE_API_PATH+`/${editing.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }
            );

            const updated = await res.json();

            // updates ProfileView
            setExperiences((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          } else {
            const res = await fetch(ADD_EXPERIENCE_API_PATH, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const created = await res.json();

            // updates ProfileView
            setExperiences((prev) => [created, ...prev]);
          }
        }}
      />
    </>
  );
}
