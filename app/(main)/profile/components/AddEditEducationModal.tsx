"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type Education from "@/types/Education";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-11
const currentValue = currentYear * 12 + currentMonth;

// Start year: past 100 years (same behavior as before)
const START_YEARS = Array.from({ length: 101 }, (_, i) => currentYear - i);

// End year: include +10 future years AND past 100 years (total 111 years)
const END_YEARS = Array.from({ length: 111 }, (_, i) => currentYear + 10 - i);

export default function AddEditEducationModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Education | null;
  onSave: (data: Omit<Education, "id">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    school: "",
    degree: "",
    fieldOfStudy: "",
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: "",
  });

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (!initial) {
      setForm({
        school: "",
        degree: "",
        fieldOfStudy: "",
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
      });
      return;
    }

    setForm({
      school: initial.school,
      degree: initial.degree,
      fieldOfStudy: initial.fieldOfStudy,
      startMonth: String(initial.startMonth),
      startYear: String(initial.startYear),
      endMonth: String(initial.endMonth),
      endYear: String(initial.endYear),
    });
  }, [open, initial]);

  const startValue = useMemo(
    () => Number(form.startYear) * 12 + Number(form.startMonth),
    [form.startYear, form.startMonth]
  );

  const endValue = useMemo(
    () => Number(form.endYear) * 12 + Number(form.endMonth),
    [form.endYear, form.endMonth]
  );

  const handleSave = async () => {
    if (isSaving) return;

    setError("");

    if (!form.school.trim()) return setError("School is required");
    if (!form.startMonth || !form.startYear)
      return setError("Start date is required");
    if (!form.endMonth || !form.endYear)
      return setError("End date is required");

    //  Security/validation: start date cannot be in the future
    if (startValue > currentValue)
      return setError("Start date cannot be in the future");

    if (endValue <= startValue)
      return setError("End date must be later than start date");

    try {
      setIsSaving(true);
      await onSave({
        school: form.school.trim(),
        degree: form.degree.trim(),
        fieldOfStudy: form.fieldOfStudy.trim(),
        startMonth: Number(form.startMonth),
        startYear: Number(form.startYear),
        endMonth: Number(form.endMonth),
        endYear: Number(form.endYear),
      });

      onClose();
    } catch {
      setError("Failed to save education. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const startYearNum = Number(form.startYear);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 font-inter">
      <div className="bg-white w-full max-w-xl rounded-xl p-6 border border-gray-200 shadow-xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Education
          </h2>
          <button onClick={onClose} className="cursor-pointer">
            <X className="text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-3 font-medium">
            {error}
          </p>
        )}

        {/* SCHOOL */}
        <input
          placeholder="Harvard University"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* DEGREE */}
        <input
          placeholder="Bachelor’s degree"
          value={form.degree}
          onChange={(e) => setForm({ ...form, degree: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* FIELD OF STUDY */}
        <input
          placeholder="Computer Science"
          value={form.fieldOfStudy}
          onChange={(e) => setForm({ ...form, fieldOfStudy: e.target.value })}
          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* START DATE */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            value={form.startMonth}
            onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg
                       text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Start month</option>
            {MONTHS.map((m, i) => {
              const disableFutureMonth =
                startYearNum === currentYear && i > currentMonth;

              return (
                <option key={i} value={i} disabled={disableFutureMonth}>
                  {m}
                </option>
              );
            })}
          </select>

          <select
            value={form.startYear}
            onChange={(e) => setForm({ ...form, startYear: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg
                       text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Start year</option>
            {START_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* END DATE */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <select
            value={form.endMonth}
            onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg
                       text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">End month</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={form.endYear}
            onChange={(e) => setForm({ ...form, endYear: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg
                       text-gray-900 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">End year</option>
            {END_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* SAVE */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full px-5 py-2 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
