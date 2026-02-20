"use client";

import Image from "next/image";

export default function RecommendedCard({ user }: any) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border hover:shadow-md transition-all">
      <div className="relative">
        <div className="h-14 w-14 rounded-xl overflow-hidden ring-1 ring-neutral-200">
          <Image src={user.avatar} alt={user.name} fill className="object-cover" />
        </div>

        {user.isOnline && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
        )}
      </div>

      <div className="flex-1 text-sm">
        <p className="font-semibold text-gray-900">{user.name}</p>
        <p className="text-gray-600 text-xs">{user.title}</p>
        <p className="text-gray-500 text-xs">{user.batch}</p>
        <p className="text-gray-500 text-xs">{user.location}</p>
      </div>

      <button className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer">
        Connect
      </button>
    </div>
  );
}
