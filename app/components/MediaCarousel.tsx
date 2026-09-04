"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import PostPollView from "./PostPollView";

export default function MediaCarousel({
  postType,
  pollOptions,
  pollVotes,
  pollEndsAt,
  clickedIndex,
  mediaList,
  onClose,
}: {
  postType: string;
  pollOptions?: string[];
  pollVotes?: Record<string, string[]>;
  pollEndsAt?: Date;
  clickedIndex: number;
  mediaList: { url: string; type: string; thumbnailUrl?: string }[];
  onClose: () => void;
}) {
  /**
   * If this is a poll post, we treat the poll as slide 0.
   * Media starts from slide 1.
   */
  const hasPollSlide = postType === "poll";

  const totalSlides = hasPollSlide ? mediaList.length + 1 : mediaList.length;

  const [currentIndex, setCurrentIndex] = useState(clickedIndex);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const router = useRouter();

  // Touch (swipe) handling
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentIndex < totalSlides - 1) {
        slideNext();
      } else if (deltaX > 0 && currentIndex > 0) {
        slidePrev();
      }
    }

    touchStartX.current = null;
  };

  // Navigation
  const slidePrev = () => {
    setDirection("left");
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);

    const params = new URLSearchParams(window.location.search);
    params.set("media", newIndex.toString());
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const slideNext = () => {
    setDirection("right");
    const newIndex = Math.min(totalSlides - 1, currentIndex + 1);
    setCurrentIndex(newIndex);

    const params = new URLSearchParams(window.location.search);
    params.set("media", newIndex.toString());
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  // Keyboard handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < totalSlides - 1) {
        slideNext();
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        slidePrev();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, totalSlides, onClose]);

  // Preload adjacent images (media only, not poll)
  useEffect(() => {
    const preload = (index: number) => {
      if (!mediaList[index]) return;
      if (mediaList[index].type !== "image") return;
      const img = new Image();
      img.src = mediaList[index].url;
    };

    const mediaIndex = hasPollSlide ? currentIndex - 1 : currentIndex;

    preload(mediaIndex - 1);
    preload(mediaIndex + 1);
  }, [currentIndex, mediaList, hasPollSlide]);

  /**
   * If we have a poll slide:
   * - currentIndex === 0 → poll
   * - media index = currentIndex - 1
   */
  const isPollSlide = hasPollSlide && currentIndex === 0;
  const mediaIndex = hasPollSlide ? currentIndex - 1 : currentIndex;

  return (
    <div
      className={`relative flex-1 overflow-hidden ${
        isPollSlide ? "bg-white flex items-center justify-center" : "bg-black"
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        key={currentIndex}
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out ${
          direction === "right" ? "animate-slide-left" : "animate-slide-right"
        }`}
      >
        {/* Poll slide (view-only) */}
        {isPollSlide && (
          <div className="w-full h-full bg-neutral-100 flex items-center justify-center px-10">
            <PostPollView
              options={pollOptions ?? []}
              votes={pollVotes}
              endsAt={pollEndsAt}
            />
          </div>
        )}

        {/* Video */}
        {!isPollSlide && mediaList[mediaIndex]?.type === "video" && (
          <VideoPlayer
            src={mediaList[mediaIndex]?.url}
            poster={mediaList[mediaIndex]?.thumbnailUrl}
            loadOnPlay
            showControls
            className="w-full h-full"
          />
        )}

        {/* Image */}
        {!isPollSlide && mediaList[mediaIndex]?.type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaList[mediaIndex]?.url}
            alt=""
            loading="eager"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <button
          onClick={slidePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black"
        >
          ‹
        </button>
      )}

      {/* Right arrow */}
      {currentIndex < totalSlides - 1 && (
        <button
          onClick={slideNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-black/50 rounded-full p-2 hover:bg-black"
        >
          ›
        </button>
      )}
    </div>
  );
}
