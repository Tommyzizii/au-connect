"use client";

import type Experience from "@/types/Experience";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ExperienceItem(exp: Experience) {
  const start = `${MONTHS[exp.startMonth]} ${exp.startYear}`;
  const end = exp.isCurrent
    ? "Present"
    : `${MONTHS[exp.endMonth!]} ${exp.endYear}`;

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900">
        {exp.title}
      </h3>

      <p className="text-sm text-gray-800">
        {exp.company} · {exp.employmentType}
      </p>

      <p className="text-sm text-gray-600">
        {start} – {end}
      </p>

    </div>
  );
}
