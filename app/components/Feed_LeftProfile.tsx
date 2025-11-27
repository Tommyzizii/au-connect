import { LeftProfilePropTypes } from "@/types/FeedPagePropTypes";
import Image from "next/image";

export default function LeftProfile({ user, loading }: LeftProfilePropTypes) {
  if (loading) {
    return (
      <div className="col-span-3">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20">
          <div className="h-24 bg-gray-200 animate-pulse"></div>
          <div className="p-4 -mt-12">
            <div className="relative w-20 h-20 mb-3 bg-gray-300 rounded-full animate-pulse border-4 border-white"></div>
            <div className="h-6 bg-gray-300 rounded w-3/4 mb-3 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-3">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20">
        <div className="h-24 bg-gray-200"></div>
        <div className="p-4 -mt-12">
          <div className="relative w-20 h-20 mb-3">
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="rounded-full border-4 border-white object-cover"
            />
          </div>
          <h2 className="font-bold text-gray-900 text-lg">
            {user.name}
          </h2>
          <p className="text-sm text-gray-600 mb-1">{user.title}</p>
          <p className="text-xs text-gray-500 mb-1">{user.education}</p>
          <p className="text-xs text-gray-500">{user.location}</p>
        </div>
      </div>
    </div>
  );
}