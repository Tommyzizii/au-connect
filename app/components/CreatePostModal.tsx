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
} from "lucide-react";

import CreatePostModalPropTypes from "@/types/CreatePostModalPropTypes";
import { handleCreatePost } from "../profile/utils/fetchfunctions";
import { uploadFile } from "../profile/utils/uploadMedia";

// TODO:put these in separate file
type MediaType = "image" | "video" | "file";

type MediaItem = {
  id: string;
  file: File;
  previewUrl: string | undefined;
  type: MediaType;
};

const getMediaType = (file: File): MediaType => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file"; // pdf, docx, zip, etc
};

export default function CreatePostModal({
  user,
  isOpen,
  setIsOpen,
  initialType = "media",
  enableSuccessModal, 
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

  useEffect(() => {
    return () => {
      media.forEach((m) =>
        URL.revokeObjectURL(m.previewUrl ? m.previewUrl : "")
      );
    };
  }, [media]);

  /** Update modal type whenever parent changes it */
  useEffect(() => {
    setPostType(initialType);
  }, [initialType]);

  const handleSubmitPost = async () => {
    console.log("Handle submit is running");
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const uploadedMedia = await Promise.all(
        media.map(async (item) => {
          
          const blobName = await uploadFile(item.file);

          if (!blobName) {
            throw new Error("Upload failed: no URL returned");
          }

          return {
            blobName,
            type: item.type,
            name: item.file.name,
            mimetype: item.file.type,
            size: item.file.size,
          };
        })
      );

      await handleCreatePost(
        postType,
        title,
        postContent,
        selectedVisibility,
        disableComments,
        uploadedMedia,
        () => setIsOpen(false)
      );

      enableSuccessModal();
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
    (opt) => opt.id === selectedVisibility
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
                  src={user.profilePic ? user.profilePic : "/default_profile"}
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

          {/* Close button */}
          <button
            onClick={handleClose}
            className="ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
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
            // className="w-full h-44 text-gray-600 resize-none border-none outline-none text-base"
            className={`w-full ${
              media.length == 0 ? "h-44" : "h-25"
            } text-gray-600 resize-none border-none outline-none text-base`}
            placeholder="What's on your mind?"
          />
        </div>

        {media.length > 0 && (
          <div className="mb-10 px-5 relative w-full h-64 overflow-hidden">
            {media[currentImage].type === "image" && (
              <img
                src={media[currentImage].previewUrl}
                alt="preview"
                className="h-full w-auto min-w-full object-cover mx-auto"
              />
            )}

            {media[currentImage].type === "video" && (
              <video
                src={media[currentImage].previewUrl}
                controls
                className="h-full w-auto min-w-full object-cover mx-auto"
              />
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
                className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
              >
                <ArrowBigLeft />
              </button>
            )}

            {/* Next */}
            {currentImage < media.length - 1 && (
              <button
                onClick={() => setCurrentImage((i) => i + 1)}
                className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
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
              className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm"
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
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (!files.length) return;

              const newItems: MediaItem[] = files.map((file) => {
                const type = getMediaType(file);

                return {
                  id: crypto.randomUUID(),
                  file,
                  type,
                  previewUrl:
                    type === "image" || type === "video"
                      ? URL.createObjectURL(file)
                      : undefined,
                };
              });

              setMedia((prev) => [...prev, ...newItems]);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2 text-neutral-500 text-sm bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
            <span className="text-xs font-semibold text-neutral-600 mr-2">
              Add to your post
            </span>

            {/* Keep your attachments */}
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

            {/* TODO:implement people tagging people */}
            <button
              onClick={() => {
                console.log("Feature not yet implmented yet");
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
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>

            <button
              onClick={() => handleSubmitPost()}
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition ${
                isSubmitting
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-600 via-purple-600 to-pink-600"
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
