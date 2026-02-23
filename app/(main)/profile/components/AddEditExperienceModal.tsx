"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type Experience from "@/types/Experience";
import type { EmploymentType } from "@/lib/generated/prisma";

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-11
const currentValue = currentYear * 12 + currentMonth;

const YEARS = Array.from({ length: 101 }, (_, i) => currentYear - i);

export default function AddEditExperienceModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Experience | null;
  onSave: (data: Omit<Experience, "id">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    employmentType: "" as EmploymentType | "",
    company: "",
    isCurrent: false,
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
        title: "",
        employmentType: "",
        company: "",
        isCurrent: false,
        startMonth: "",
        startYear: "",
        endMonth: "",
        endYear: "",
      });
      return;
    }

    setForm({
      title: initial.title,
      employmentType: initial.employmentType,
      company: initial.company,
      isCurrent: initial.isCurrent,
      startMonth: String(initial.startMonth),
      startYear: String(initial.startYear),
      endMonth: initial.endMonth?.toString() ?? "",
      endYear: initial.endYear?.toString() ?? "",
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

    if (!form.title.trim()) return setError("Title is required");
    if (!form.company.trim()) return setError("Company is required");
    if (!form.employmentType) return setError("Employment type is required");
    if (!form.startMonth || !form.startYear)
      return setError("Start date is required");

    //  start date cannot be in the future
    if (startValue > currentValue)
      return setError("Start date cannot be in the future");

    if (!form.isCurrent) {
      if (!form.endMonth || !form.endYear)
        return setError("End date is required");

      //  end must be after start
      if (endValue <= startValue)
        return setError("End date must be later than start date");

      //  end date cannot be in the future
      if (endValue > currentValue)
        return setError("End date cannot be in the future");
    }

    try {
      setIsSaving(true);
      await onSave({
        title: form.title.trim(),
        employmentType: form.employmentType,
        company: form.company.trim(),
        isCurrent: form.isCurrent,
        startMonth: Number(form.startMonth),
        startYear: Number(form.startYear),
        endMonth: form.isCurrent ? undefined : Number(form.endMonth),
        endYear: form.isCurrent ? undefined : Number(form.endYear),
      });

      onClose();
    } catch {
      setError("Failed to save experience. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const startYearNum = Number(form.startYear);
  const endYearNum = Number(form.endYear);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 font-inter">
      <div className="bg-white w-full max-w-xl rounded-xl p-6 border border-gray-200 shadow-xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Experience
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

        {/* TITLE */}
        <input
          placeholder="Senior frontend developer"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* EMPLOYMENT TYPE */}
        <select
          value={form.employmentType}
          onChange={(e) =>
            setForm({
              ...form,
              employmentType: e.target.value as EmploymentType,
            })
          }
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Employment type</option>
          <option value="FULL_TIME">{EMPLOYMENT_LABELS.FULL_TIME}</option>
          <option value="PART_TIME">{EMPLOYMENT_LABELS.PART_TIME}</option>
          <option value="FREELANCE">{EMPLOYMENT_LABELS.FREELANCE}</option>
          <option value="INTERNSHIP">{EMPLOYMENT_LABELS.INTERNSHIP}</option>
        </select>

        {/* COMPANY */}
        <input
          placeholder="Facebook"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* CURRENT */}
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) =>
              setForm({
                ...form,
                isCurrent: e.target.checked,
                endMonth: "",
                endYear: "",
              })
            }
          />
          <span className="text-sm text-gray-800">
            I am currently working in this role
          </span>
        </label>

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
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* END DATE */}
        {!form.isCurrent && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <select
              value={form.endMonth}
              onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg
                         text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">End month</option>
              {MONTHS.map((m, i) => {
                const disableFutureMonth =
                  endYearNum === currentYear && i > currentMonth;

                return (
                  <option key={i} value={i} disabled={disableFutureMonth}>
                    {m}
                  </option>
                );
              })}
            </select>

            <select
              value={form.endYear}
              onChange={(e) => setForm({ ...form, endYear: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg
                         text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">End year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

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
