import Image from "next/image";
import { useState } from "react";
import PostDetailsModal from "./PostDetailsModal";

export default function PostMediaGrid({
  media,
  maxVisible = 4,
  isLoading,
}: {
  media: { url: string; type: string }[];
  maxVisible?: number;
  isLoading: boolean;
}) {
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const openPost = (index: number) => {
    setCurrentMediaIndex(index);
    setPostModalOpen(true);
  }

  if (!media || media.length === 0) return null;

  const visibleMedia = media.slice(0, maxVisible);
  const extraCount = media.length - maxVisible;
  const isSingle = media.length === 1;
  // LCP = Largest Contentful Paint
  const isLcp = (index: number) => index === 0 && isSingle;
  const gridClass = isSingle ? "grid-cols-1" : "grid-cols-2";

  // Show skeleton loading state
  if (isLoading) {
    return (
      <div className={`grid ${gridClass} gap-1 overflow-hidden`}>
        {visibleMedia.map((_, index) => (
          <div
            key={index}
            className={
              isSingle
                ? "w-full overflow-hidden aspect-square"
                : "relative w-full aspect-square"
            }
          >
            <div className="w-full h-full bg-gray-200 animate-pulse relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-1 overflow-hidden`}>
      {visibleMedia.map((item, index) => {
        const isLastVisible = index === maxVisible - 1 && extraCount > 0;
        return (
          <div
            key={index}
            className={
              isSingle
                ? "w-full overflow-hidden"
                : "relative w-full aspect-square cursor-pointer"
            }
            onClick={() => openPost(index)}
          >
            <Image
              src={item.url}
              alt="Post media"
              {...(isSingle
                ? {
                    width: 800,
                    height: 800,
                    className:
                      "w-full h-auto max-h-[70vh] object-cover object-center",
                  }
                : {
                    fill: true,
                    className: "object-cover object-center",
                  })}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={isLcp(index)}
              loading={isLcp(index) ? "eager" : "lazy"}
            />
            {/* +N Overlay */}
            {isLastVisible && !isSingle && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-3xl font-semibold">
                  +{extraCount}
                </span>
              </div>
            )}
          </div>
        );
      })}

      { postModalOpen && (
        <PostDetailsModal media={media} clickedIndex={currentMediaIndex} onClose={() => setPostModalOpen(false)} />
      )}
    </div>
  );
}
