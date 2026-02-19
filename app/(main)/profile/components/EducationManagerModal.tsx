"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import AddEditEducationModal from "./AddEditEducationModal";
import type Education from "@/types/Education";
import { ADD_EDUCATION_API_PATH , DELETE_EDUCATION_API_PATH } from "@/lib/constants";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function EducationManagerModal({
  open,
  onClose,
  education,
  setEducation,
}: {
  open: boolean;
  onClose: () => void;
  education: Education[];
  setEducation: React.Dispatch<React.SetStateAction<Education[]>>;
}) {
  const [editing, setEditing] = useState<Education | null>(null);
  const [openForm, setOpenForm] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-inter">
        <div className="bg-white w-full max-w-2xl rounded-xl overflow-hidden border border-gray-200 shadow-xl">

          {/* HEADER */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Education
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditing(null);
                  setOpenForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                <Plus size={16} />
                Add education
              </button>

              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                <X className="text-gray-600 hover:text-gray-800" />
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="p-6 space-y-3">
            {education.map((edu) => (
              <div
                key={edu.id}
                className="border border-gray-200 rounded-lg p-4 flex justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900 truncate">
                    {edu.school}
                  </p>

                  <p className="text-sm text-gray-800">
                    {edu.degree} · {edu.fieldOfStudy}
                  </p>

                  <p className="text-sm text-gray-600 mt-1">
                    {MONTHS[edu.startMonth]} {edu.startYear} –{" "}
                    {MONTHS[edu.endMonth]} {edu.endYear} 
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      setEditing(edu);
                      setOpenForm(true);
                    }}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <Pencil size={16} className="text-gray-600" />
                  </button>

                  <button
                    onClick={async () => {
                      await fetch(
                        DELETE_EDUCATION_API_PATH + `/${edu.id}`,
                        {
                          method: "DELETE",
                          credentials: "include",
                        }
                      );

                      setEducation((prev) =>
                        prev.filter((e) => e.id !== edu.id)
                      );
                    }}
                    className="p-2 rounded-full hover:bg-red-50"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <AddEditEducationModal
        open={openForm}
        initial={editing}
        onClose={() => setOpenForm(false)}
        onSave={async (data) => {
          if (editing) {
            const res = await fetch(
              //TODO:put the route in constant
              `/api/connect/v1/profile/me/update/educationFields/${editing.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }
            );

            const updated = await res.json();

            setEducation((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          } else {
            const res = await fetch(ADD_EDUCATION_API_PATH, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const created = await res.json();

            setEducation((prev) => [created, ...prev]);
          }
        }}
      />
    </>
  );
}
