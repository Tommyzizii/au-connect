"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import { buildSlug } from "@/app/profile/utils/buildSlug";

type Props = {
  user: {
    id: string;
    username: string;
    title?: string;
    profilePic?: string;
  };
  onClose: () => void;
};

export default function ConnectionRow({ user, onClose }: Props) {
  const router = useRouter();

  const avatarUrl = useResolvedMediaUrl(
    user.profilePic,
    "/default_profile.jpg"
  );

  const slug = buildSlug(user.username || "", user.id);

  const goToProfile = () => {
    if (!slug) return;
    onClose();
    router.push(`/profile/${slug}`);
  };

  return (
    <div
      onClick={goToProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToProfile();
        }
      }}
      role="button"
      tabIndex={0}
      className="group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98]"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="relative w-12 h-12 rounded-full ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
          <Image
            src={avatarUrl}
            alt={user.username}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        </div>
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
          {user.username}
        </div>
        {user.title && (
          <div className="text-sm text-gray-500 truncate">
            {user.title}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        →
      </div>
    </div>
  );
}

