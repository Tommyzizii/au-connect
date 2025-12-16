"use client";

import React from "react";

export default function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      {/* Title + optional icon */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {title}
        </h2>

        {/* render icon directly (NO button wrapper) */}
        {icon}
      </div>

      {children}
    </div>
  );
}
