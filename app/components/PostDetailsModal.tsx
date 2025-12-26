import { useEffect, useRef, useState } from "react";
import CommentItem from "./CommentItem";

// TODO:move-to-type
type PostDetailsModalTypes = {
  media?: { url: string; type: string }[] | null;
  clickedIndex: number;
  onClose: () => void;
};

export default function PostDetailsModal({
  media,
  clickedIndex,
  onClose,
}: PostDetailsModalTypes) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mediaList = media ?? [];
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

  // Mock data
  const postUser = {
    username: "john_doe",
    profilePic: "https://i.pravatar.cc/40",
    createdAt: "2h ago",
  };

const comments: CommentType[] = [
  {
    id: "1",
    username: "alice",
    profilePic: "https://i.pravatar.cc/32?u=1",
    content: "This post is 🔥",
    createdAt: "2h",
    replies: [
      {
        id: "2",
        username: "bob",
        profilePic: "https://i.pravatar.cc/32?u=2",
        content: "Facts 💯",
        createdAt: "1h",
        replies: [
          {
            id: "3",
            username: "charlie",
            profilePic: "https://i.pravatar.cc/32?u=3",
            content: "Agreed",
            createdAt: "30m",
          },
        ],
      },
    ],
  },
];


  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-6xl h-[90vh] rounded-lg overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT: Media carousel */}
        <div
          className="relative bg-black flex-1 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            key={currentIndex}
            className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out ${
              direction === "right"
                ? "animate-slide-left"
                : "animate-slide-right"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaList[currentIndex]?.url}
              alt=""
              loading="eager"
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
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

        {/* RIGHT: Post details + comments */}
        <div className="w-full md:w-[420px] flex flex-col border-l">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            {/* the user of the post */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={postUser.profilePic}
              className="w-10 h-10 rounded-full"
              alt=""
            />
            <div>
              <div className="font-semibold text-sm text-gray-900">
                {postUser.username}
              </div>
              <div className="text-xs text-gray-900">{postUser.createdAt}</div>
            </div>

            <button
              onClick={onClose}
              className="ml-auto text-gray-900 hover:text-gray-500"
            >
              ✕
            </button>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>

          {/* Comment input */}
          <div className="border-t p-3">
            <input
              placeholder="Add a comment..."
              className="w-full text-sm text-gray-900 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Slide animations */}
      <style jsx>{`
        @keyframes slideLeft {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideRight {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-left {
          animation: slideLeft 0.3s ease-out;
        }

        .animate-slide-right {
          animation: slideRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
