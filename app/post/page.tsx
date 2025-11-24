"use client";
import { useState } from "react";
import Image from "next/image";

export default function CreatePostPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedVisibility, setSelectedVisibility] = useState("everyone");
  const [showDropdown, setShowDropdown] = useState(false);
  const [postContent, setPostContent] = useState("");

  const visibilityOptions = [
    {
      id: "everyone",
      label: "Everyone",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fillRule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      description: "Anyone on AU Connect",
    },
    {
      id: "friends",
      label: "Friends",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      description: "Your connections only",
    },
    {
      id: "only-me",
      label: "Only Me",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      description: "Only visible to you",
    },
  ];

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentVisibility = visibilityOptions.find(
    (opt) => opt.id === selectedVisibility
  );

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      {/* Centered post card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-neutral-100">
          {/* Avatar with gradient ring */}
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-white-400 to-white-500 p-0.5">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-white relative">
                <Image
                  src="/au-connect-logo.png"
                  alt="User"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="flex-1">
            <div className="text-base font-bold text-neutral-900">
              Thant Zin Min
            </div>

            {/* Visibility dropdown */}
            <div className="relative mt-2">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-gradient-to-br from-neutral-50 to-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 hover:from-neutral-100 hover:to-neutral-200 transition-all duration-200 hover:shadow-md"
              >
                {currentVisibility?.icon}
                {currentVisibility?.label}
                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedVisibility(option.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                        selectedVisibility === option.id
                          ? "bg-gradient-to-r from-blue-50 to-purple-50"
                          : ""
                      }`}
                    >
                      <div className="mt-0.5 text-neutral-600">
                        {option.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-neutral-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {option.description}
                        </div>
                      </div>
                      {selectedVisibility === option.id && (
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Text area */}
        <div className="px-6 pt-4 pb-2">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="w-full h-44 resize-none border-none outline-none text-base text-neutral-900 placeholder:text-neutral-400 leading-relaxed"
            placeholder="What's on your mind? Share your thoughts with the AU Connect community..."
          />
        </div>

        {/* Emoji & formatting bar */}
        <div className="px-6 pb-3">
          <div className="flex items-center justify-between"></div>
        </div>

        {/* Attachment row */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-neutral-500 text-sm bg-gradient-to-r from-neutral-50 to-neutral-100 rounded-2xl p-4 border border-neutral-200">
            <span className="text-xs font-semibold text-neutral-600 mr-2">
              Add to your post
            </span>

            <button className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group">
              <svg
                className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group">
              <svg
                className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </button>
            <button className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group">
              <svg
                className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group">
              <svg
                className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </button>
            <button className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 group">
              <svg
                className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-gradient-to-br from-neutral-50 to-white">
          <div className="text-xs text-neutral-500">
            Posting to{" "}
            <span className="font-semibold text-neutral-700">AU Connect</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-all duration-200 hover:scale-105"
            >
              Cancel
            </button>
            <button
              disabled={!postContent.trim()}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 ${
                postContent.trim()
                  ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-xl hover:scale-105"
                  : "bg-neutral-300 cursor-not-allowed"
              }`}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
