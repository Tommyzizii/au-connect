"use client";

import RecommendedCard from "./RecommendedCard";

export default function RecommendedModal({ open, onClose, users }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-xl p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            People you may be interested in
          </h2>
          <button onClick={onClose} className="text-gray-600 text-xl">×</button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map((user: any) => (
            <RecommendedCard key={user.id} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
}
