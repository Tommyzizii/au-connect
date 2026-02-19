"use client";

import type Education from "@/types/Education";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function EducationItem({
  school,
  degree,
  fieldOfStudy,
  startMonth,
  startYear,
  endMonth,
  endYear,
}: Education) {
  const start = `${MONTHS[startMonth]} ${startYear}`;
  const end = `${MONTHS[endMonth]} ${endYear} `;

  return (
    <div className="py-4 border-b border-gray-300 last:border-b-0">
      <h3 className="font-semibold text-gray-900">
        {school}
      </h3>

      {(degree || fieldOfStudy) && (
        <p className="text-sm text-gray-800">
          {[degree, fieldOfStudy].filter(Boolean).join(" · ")}
        </p>
      )}

      <p className="text-sm text-gray-600">
        {start} – {end}
      </p>
    </div>
  );
}
