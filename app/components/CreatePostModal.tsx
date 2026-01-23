"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowBigLeft,
  ArrowBigRight,
  Image as ImageIcon,
  Paperclip,
  UserPlus,
  Video,
  X,
  Eraser,
} from "lucide-react";
import CreatePostModalPropTypes from "@/types/CreatePostModalPropTypes";
import { MediaType, MediaItem } from "@/types/Media";
import { useUploadStore } from "@/lib/stores/uploadStore";
import { processUpload } from "@/lib/services/uploadService";

const getMediaType = (file: File): MediaType => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file"; // pdf, docx, zip, etc
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

export default function CreatePostModal({
  user,
  isOpen,
  setIsOpen,
  initialType = "media",
}: CreatePostModalPropTypes) {
  const [selectedVisibility, setSelectedVisibility] = useState("everyone");
  const [showDropdown, setShowDropdown] = useState(false);
  const [postContent, setPostContent] = useState("");

  const [postType, setPostType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [disableComments, setDisableComments] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentImage, setCurrentImage] = useState(0);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Update modal type whenever parent changes it */
  useEffect(() => {
    setPostType(initialType);
  }, [initialType]);

  useEffect(() => {
    console.log("Upload jobs:", useUploadStore.getState().jobs);
  }, []);

  const handleSubmitPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Add job to queue
      const jobId = useUploadStore.getState().addJob({
        postType,
        title,
        content: postContent,
        visibility: selectedVisibility,
        disableComments,
        media,
      });

      // Close the modal immediately
      setIsOpen(false);

      // String upload in background
      processUpload(jobId);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    (opt) => opt.id === selectedVisibility,
  );

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-neutral-100">
          {/* Avatar */}
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl overflow-hidden p-0.5">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-white relative">
                <Image
                  src={user.profilePic || "/default_profile"}
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
              {user.username}
            </div>

            {/* Visibility dropdown */}
            <div className="relative mt-2">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
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
                <div className="absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-10">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedVisibility(option.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition ${
                        selectedVisibility === option.id ? "bg-blue-50" : ""
                      }`}
                    >
                      {option.icon}
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-neutral-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            {/* clear draft button */}
            <button
              title="clear draft"
              onClick={() => {}}
              className="ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            >
              <Eraser className="text-gray-400" />
            </button>

            {/* Close button */}
            <button
              title="close"
              onClick={handleClose}
              className="ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            >
              {/* Close button X icon svg */}
              <X className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Title only for discussion & article */}
        {(postType === "discussion" || postType === "article") && (
          <div className="px-6 pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mb-3 px-4 py-3 border-t border-b border-neutral-200 text-gray-600 text-base outline-none focus:border-blue-500"
              placeholder="Title..."
            />
          </div>
        )}

        {/* Text area */}
        <div className="px-6 pt-2 pb-2">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className={`w-full ${
              media.length === 0 ? "h-44" : "h-25"
            } text-gray-600 resize-none border-none outline-none text-base`}
            placeholder="What's on your mind?"
          />
        </div>

        {/* Media Preview */}
        {media.length > 0 && (
          <div className="mb-10 px-5 relative w-full">
            {media[currentImage].type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media[currentImage].previewUrl}
                alt="preview"
                className="h-full w-auto min-w-full object-cover mx-auto"
              />
            )}

            {media[currentImage].type === "video" && (
              <div className="w-full">
                <div className="flex flex-col items-center justify-center bg-neutral-900 rounded-t-xl py-12">
                  <Video className="h-16 w-16 text-white mb-3" />
                  <p className="text-white text-lg font-semibold">
                    ✅ Video Ready to Upload
                  </p>
                </div>
                <div className="bg-neutral-100 rounded-b-xl p-4">
                  <p className="text-sm font-semibold text-neutral-900 mb-2">
                    {media[currentImage].file.name}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span>
                      Size: {formatFileSize(media[currentImage].file.size)}
                    </span>
                    <span>
                      Type: {media[currentImage].file.type || "video"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {media[currentImage].type === "file" && (
              <div className="flex items-center justify-center h-full bg-neutral-100 rounded-xl">
                <div className="text-center">
                  <Paperclip className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm font-semibold">
                    {media[currentImage].file.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {(media[currentImage].file.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                  </p>
                </div>
              </div>
            )}

            {/* Prev */}
            {currentImage > 0 && (
              <button
                onClick={() => setCurrentImage((i) => i - 1)}
                className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
              >
                <ArrowBigLeft />
              </button>
            )}

            {/* Next */}
            {currentImage < media.length - 1 && (
              <button
                onClick={() => setCurrentImage((i) => i + 1)}
                className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
              >
                <ArrowBigRight />
              </button>
            )}

            {/* Remove */}
            <button
              onClick={() => {
                const previewUrl = media[currentImage].previewUrl;
                URL.revokeObjectURL(previewUrl ? previewUrl : "");
                setMedia((prev) => prev.filter((_, i) => i !== currentImage));
                setCurrentImage((i) => Math.max(0, i - 1));
              }}
              className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/80 transition"
            >
              Remove
            </button>
          </div>
        )}

        {/* Attachment row */}
        <div className="px-6 pb-4">
          {/* hidden input element */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.zip"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;

              const newItems: MediaItem[] = await Promise.all(
                files.map(async (file) => {
                  const type = getMediaType(file);
                  const previewUrl =
                    type === "image" || type === "video"
                      ? URL.createObjectURL(file)
                      : undefined;

                  return {
                    id: crypto.randomUUID(),
                    file,
                    type,
                    previewUrl,
                  };
                }),
              );

              setMedia((prev) => [...prev, ...newItems]);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2 text-neutral-500 text-sm bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
            <span className="text-xs font-semibold text-neutral-600 mr-2">
              Add to your post
            </span>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
            >
              <ImageIcon className="h-5 w-5 text-green-600" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
            >
              <Video className="h-5 w-5 text-red-600" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
            >
              <Paperclip className="h-5 w-5 text-blue-600" />
            </button>

            <button
              onClick={() => {
                window.alert("Feature not yet implemented yet");
              }}
              className="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
            >
              <UserPlus className="h-5 w-5 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-neutral-50">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={disableComments}
              onChange={(e) => setDisableComments(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-neutral-700">Disable comments</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={() => handleSubmitPost()}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition ${
                isSubmitting
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-xl"
              }`}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
