"use client";

import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";

export default function MediaCarousel({
  clickedIndex,
  mediaList,
  onClose,
}: {
  clickedIndex: number;
  mediaList: { url: string; type: string }[];
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(clickedIndex);
  const [direction, setDirection] = useState<"left" | "right">("right");

  // Touch (swipe) handling
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentIndex < mediaList.length - 1) {
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
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const slideNext = () => {
    setDirection("right");
    setCurrentIndex((i) => Math.min(mediaList.length - 1, i + 1));
  };

  // Keyboard handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < mediaList.length - 1) {
        slideNext();
      }
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        slidePrev();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mediaList.length]);

  // Preload adjacent images
  useEffect(() => {
    const preload = (index: number) => {
      if (!mediaList[index]) return;
      const img = new Image();
      img.src = mediaList[index].url;
    };

    preload(currentIndex - 1);
    preload(currentIndex + 1);
  }, [currentIndex, mediaList]);
  return (
    <div
      className="relative bg-black flex-1 overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        key={currentIndex}
        className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out ${
          direction === "right" ? "animate-slide-left" : "animate-slide-right"
        }`}
      >
        {mediaList[currentIndex]?.type === "video" && (
          <VideoPlayer
            src={mediaList[currentIndex]?.url}
            showControls
            autoPlay
            muted
            loop
            className="w-full h-full"
          />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        {mediaList[currentIndex]?.type === "image" && (
          <img
            src={mediaList[currentIndex]?.url}
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
      {currentIndex < mediaList.length - 1 && (
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
