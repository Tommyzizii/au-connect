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
  Link as LinkIcon,
} from "lucide-react";

import { useUploadStore } from "@/lib/stores/uploadStore";
import { processUpload } from "@/lib/services/uploadService";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";
import { useDraftStore } from "@/lib/stores/draftStore";
import { useEditPost } from "@/app/profile/utils/fetchfunctions";
import { PostMediaWithUrl } from "@/types/PostMedia";
import { processEdit } from "@/lib/services/uploadService";
import VideoPlayer from "./VideoPlayer";
import JobPostCreationSection from "./JobPostCreationSection";
import AddLinkModal from "./AddLinkModal";
import LinkEmbedPreview from "./Linkembedpreview";
import LinkEmbed from "@/types/LinkEmbeds";
import CreatePostModalPropTypes from "@/types/CreatePostModalPropTypes";
import { MediaType, MediaItem } from "@/types/Media";
import JobDraft from "@/types/JobDraft";
import { validateJobDraft } from "../profile/utils/validateJobPosts";

const getMediaType = (file: File): MediaType => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
};

const getDraftFileString = (fList: string[]) => {
  if (!fList.length) return "";
  const filesPart = fList.join(", ");
  const suffix = fList.length > 1 ? "files were" : "file was";
  return `${filesPart} ${suffix} uploaded before`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

const EMPTY_JOB_DRAFT: JobDraft = {
  id: "",
  jobTitle: "",
  companyName: "",
  location: "",
  locationType: "",
  employmentType: "",
  salaryMin: undefined,
  salaryMax: undefined,
  salaryCurrency: "USD",
  status: "OPEN",
  deadline: "",
  applyUrl: "",
  allowExternalApply: false,
};

export default function CreatePostModal({
  user,
  isOpen,
  setIsOpen,
  initialType = "media",
  editMode = false,
  exisistingPost,
}: CreatePostModalPropTypes) {
  const [selectedVisibility, setSelectedVisibility] = useState("everyone");
  const [showDropdown, setShowDropdown] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [disableComments, setDisableComments] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Separate state for new uploads vs existing media
  const [newMedia, setNewMedia] = useState<MediaItem[]>([]);
  const [existingMedia, setExistingMedia] = useState<PostMediaWithUrl[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Link embeds states
  const [links, setLinks] = useState<LinkEmbed[]>([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  // Poll-specific states
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState(7);
  const [showBody, setShowBody] = useState(false);

  // Job post states
  const [jobDraft, setJobDraft] = useState<JobDraft>(EMPTY_JOB_DRAFT);
  const [jobErrors, setJobErrors] = useState<Record<string, string>>({});

  const editPostMutation = useEditPost();

  const resolvedProfilePicUrl = useResolvedMediaUrl(
    user?.profilePic,
    DEFAULT_PROFILE_PIC,
  );

  const { draft, saveDraft, clearDraft, hasDraft } = useDraftStore();
  const hasDraftFiles =
    draft.mediaFileNames.length > 0 && newMedia.length === 0;

  const hasTextContent = postContent.trim().length > 0;
  const hasTitle = postType === "article" && title.trim().length > 0;
  const hasMedia = newMedia.length > 0 || existingMedia.length > 0;
  const hasLinks = links.length > 0;
  const hasValidPoll =
    postType === "poll" &&
    title.trim().length > 0 &&
    pollOptions.filter((opt) => opt.trim().length > 0).length >= 2;
  const hasValidJob =
    postType === "job_post" &&
    jobDraft &&
    jobDraft.jobTitle.trim().length > 0 &&
    jobDraft.employmentType !== "";

  const canPost =
    postType === "job_post"
      ? hasValidJob
      : hasTextContent || hasTitle || hasMedia || hasLinks || hasValidPoll;

  // Total media count for carousel
  const totalMedia = [...existingMedia, ...newMedia];

  const handleClose = () => {
    setIsOpen(false);
  };

  // Load initial post data when in edit mode
  useEffect(() => {
    if (editMode && exisistingPost && isOpen) {
      setPostType(exisistingPost.postType || "media");
      setTitle(exisistingPost.title || "");
      setPostContent(exisistingPost.content || "");
      setSelectedVisibility(exisistingPost.visibility || "everyone");

      // Load existing job post data
      if (exisistingPost.postType === "poll" && exisistingPost.pollOptions) {
        setPollOptions(exisistingPost.pollOptions);
      }

      // Load existing job post data
      if (exisistingPost.postType === "job_post" && exisistingPost.jobPost) {
        const job = exisistingPost.jobPost;

        setJobDraft({
          jobTitle: job.jobTitle || "",
          companyName: job.companyName || "",
          location: job.location || "",
          locationType: job.locationType || "",
          employmentType: job.employmentType || "",
          salaryMin: job.salaryMin ?? undefined,
          salaryMax: job.salaryMax ?? undefined,
          salaryCurrency: job.salaryCurrency || "USD",
          status: job.status || "OPEN",
          deadline: job.deadline || "",
          jobDetails: job.jobDetails || "",
          jobRequirements: job.jobRequirements || [],
          applyUrl: job.applyUrl || "",
          allowExternalApply: job.allowExternalApply ?? false,
        });
      }

      // Load existing media
      if (exisistingPost.media && exisistingPost.media.length > 0) {
        setExistingMedia(
          exisistingPost.media.map((m) => ({
            blobName: m.blobName,
            thumbnailBlobName: m.thumbnailBlobName,
            url: m.url,
            type: m.type,
            name: m.name ?? m.blobName,
            mimetype: m.mimetype ?? "application/octet-stream",
            size: m.size ?? 0,
          })),
        );
      }

      // Load existing links
      if (exisistingPost.links && exisistingPost.links.length > 0) {
        setLinks(exisistingPost.links);
      }
    }
  }, [editMode, exisistingPost, isOpen]);

  // Load draft (only if NOT in edit mode)
  useEffect(() => {
    if (!editMode && hasDraft() && isOpen) {
      setPostType(draft.postType);
      setTitle(draft.title);
      setPostContent(draft.content);
      setSelectedVisibility(draft.visibility);
      setDisableComments(draft.disableComments);
    }
  }, [isOpen, editMode, hasDraft, draft]);

  // Auto-save draft (only if NOT in edit mode)
  useEffect(() => {
    if (editMode) return;

    const timer = setTimeout(() => {
      if (postContent || title || newMedia.length > 0 || links.length > 0) {
        saveDraft({
          postType,
          title,
          content: postContent,
          visibility: selectedVisibility,
          disableComments,
          mediaFileNames:
            newMedia.length > 0
              ? newMedia.map((m) => m.file?.name || "").filter(Boolean)
              : draft.mediaFileNames,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    postContent,
    title,
    newMedia,
    links,
    selectedVisibility,
    disableComments,
    editMode,
  ]);

  useEffect(() => {
    if (!editMode) {
      setPostType(initialType);
    }
  }, [initialType, editMode]);

  const handleClearDraft = () => {
    setSelectedVisibility("everyone");
    clearDraft();
    setTitle("");
    setPostContent("");
    setNewMedia([]);
    setLinks([]);
    setDisableComments(false);
  };

  const handleAddLink = (linkData: {
    url: string;
    title: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  }) => {
    // Create link embed with user-provided data + fetched metadata
    const newLink: LinkEmbed = {
      url: linkData.url,
      title: linkData.title,
      description: linkData.description,
      image: linkData.image,
      siteName: linkData.siteName,
      favicon: linkData.favicon,
    };

    setLinks((prev) => [...prev, newLink]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPost = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (postType === "job_post") {
      const errors = validateJobDraft(jobDraft);

      if (Object.keys(errors).length > 0) {
        setJobErrors(errors);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editMode && exisistingPost) {
        const hasNewMedia = newMedia.length > 0;

        if (hasNewMedia) {
          // EDIT VIA BACKGROUND JOB
          const jobData: any = {
            isEdit: true,
            postId: exisistingPost.id,
            postType,
            title,
            content: postContent,
            visibility: selectedVisibility,
            disableComments,
            media: newMedia,
            existingMedia: existingMedia,
            links: links,
            ...(postType === "job_post" && { job: jobDraft }),
          };

          if (postType === "poll") {
            jobData.pollOptions = pollOptions.filter(
              (opt) => opt.trim() !== "",
            );
            jobData.pollDuration = pollDuration;
          }

          const jobId = useUploadStore.getState().addJob(jobData);
          setIsOpen(false);
          processEdit(jobId);
        } else {
          // EDIT WITHOUT UPLOAD
          const editData: any = {
            postType,
            title,
            content: postContent,
            visibility: selectedVisibility,
            commentsDisabled: disableComments,
            media: existingMedia.map((m) => ({
              blobName: m.blobName,
              thumbnailBlobName: m.thumbnailBlobName,
              type: m.type,
              name: m.name,
              mimetype: m.mimetype,
              size: m.size,
            })),
            links: links,
            ...(postType === "job_post" && { job: jobDraft }),
          };

          if (postType === "poll") {
            editData.pollOptions = pollOptions.filter(
              (opt) => opt.trim() !== "",
            );
            editData.pollDuration = pollDuration;
          }

          await editPostMutation.mutateAsync({
            postId: exisistingPost.id,
            data: editData,
          });

          setIsOpen(false);
        }
      } else {
        // CREATE POST (ALWAYS JOB)
        const jobData: any = {
          postType,
          title,
          content: postContent,
          visibility: selectedVisibility,
          disableComments,
          media: newMedia,
          links: links,
          job: jobDraft,
        };

        if (postType === "poll") {
          jobData.pollOptions = pollOptions.filter((opt) => opt.trim() !== "");
          jobData.pollDuration = pollDuration;
        }

        const jobId = useUploadStore.getState().addJob(jobData);
        setIsOpen(false);
        processUpload(jobId);
        clearDraft();
      }
    } catch (err) {
      console.error("❌ Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMedia = () => {
    const isExisting = currentMediaIndex < existingMedia.length;

    if (isExisting) {
      setExistingMedia((prev) =>
        prev.filter((_, i) => i !== currentMediaIndex),
      );
    } else {
      const newMediaIndex = currentMediaIndex - existingMedia.length;
      const mediaItem = newMedia[newMediaIndex];
      if (mediaItem.previewUrl) {
        URL.revokeObjectURL(mediaItem.previewUrl);
      }
      setNewMedia((prev) => prev.filter((_, i) => i !== newMediaIndex));
    }

    setCurrentMediaIndex((i) => Math.max(0, i - 1));
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

  if (!isOpen) return null;

  const currentVisibility = visibilityOptions.find(
    (opt) => opt.id === selectedVisibility,
  );

  const currentMedia = totalMedia[currentMediaIndex];
  const isCurrentExisting = currentMediaIndex < existingMedia.length;

  return (
    <>
      <div
        onMouseDown={() => setIsOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200"
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto transform animate-in zoom-in-95 duration-300"
        >
          {/* Header */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-neutral-100">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl overflow-hidden p-0.5">
                <div className="h-full w-full rounded-2xl overflow-hidden bg-white relative">
                  <Image
                    src={resolvedProfilePicUrl}
                    alt="User"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            <div className="flex-1">
              {/* header title */}
              <div className="text-base font-bold text-neutral-900">
                {editMode ? "Edit Post" : user.username}
              </div>

              {/*  visibility option button */}
              <div className="relative mt-2">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
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

                {/*  visibility option dropdown */}
                {showDropdown && (
                  <div className="absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 z-10">
                    {visibilityOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSelectedVisibility(option.id);
                          setShowDropdown(false);
                        }}
                        className={`cursor-pointer w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition ${
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
              {!editMode && (
                <button
                  title="clear draft"
                  onClick={handleClearDraft}
                  className="cursor-pointer ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                >
                  <Eraser className="text-gray-400" />
                </button>
              )}

              {/* exist create post modal button */}
              <button
                title="close"
                onClick={handleClose}
                className="cursor-pointer ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              >
                <X className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* post type selector */}
          <div className="px-6 pt-4 pb-2 border-b border-neutral-100">
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl">
              {[
                { id: "media", label: "Standard", icon: "✨" },
                { id: "article", label: "Article", icon: "📝" },
                { id: "poll", label: "Poll", icon: "📊" },
                { id: "job_post", label: "Job Post", icon: "💼" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPostType(type.id)}
                  className={`cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    postType === type.id
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <span>{type.icon}</span>
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {postType === "job_post" && (
            <JobPostCreationSection
              value={jobDraft}
              onChange={setJobDraft}
              errors={jobErrors}
            />
          )}

          {/* input for title */}
          {(postType === "article" || postType == "poll") && (
            <div className="my-4 mx-5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-gray-700 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder={
                  postType === "poll"
                    ? "Add a question title... : "
                    : "Add a title..."
                }
              />
            </div>
          )}

          {/* input for poll options */}
          {postType === "poll" && !showBody && (
            <div className="px-6 pb-5">
              <button
                onClick={() => setShowBody(true)}
                className="text-sm text-blue-600 font-semibold hover:text-blue-700"
              >
                + Add body text (optional)
              </button>
            </div>
          )}

          {/* text area input for all options except job_post and poll on condition*/}
          {((postType !== "job_post" && postType !== "poll") || showBody) && (
            <div className="px-6 pt-2 pb-2">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className={`w-full ${
                  totalMedia.length === 0
                    ? postType === "poll"
                      ? "h-20"
                      : "h-44"
                    : postType === "poll"
                      ? "h-20"
                      : "h-24"
                } text-gray-600 resize-none border-none outline-none text-base`}
                placeholder="What's on your mind?"
              />
            </div>
          )}

          {/* poll option inputs */}
          {postType === "poll" && (
            <div className="px-6 pb-4">
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                  Poll Options
                </p>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">
                        {i + 1}.
                      </span>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[i] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => {
                          setPollOptions((p) =>
                            p.filter((_, idx) => idx !== i),
                          );
                        }}
                        className="cursor-pointer p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Remove option"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 10 && (
                  <button
                    onClick={() => setPollOptions((p) => [...p, ""])}
                    className="cursor-pointer w-full py-2.5 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-blue-600 font-semibold hover:border-blue-400 hover:bg-blue-50 transition"
                  >
                    + Add Option
                  </button>
                )}
              </div>

              {/* poll duration input */}
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="text-sm font-medium text-neutral-700">
                  Poll Duration
                </span>
                <select
                  value={pollDuration}
                  onChange={(e) => setPollDuration(+e.target.value)}
                  className="cursor-pointer px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>1 week</option>
                  <option value={14}>2 weeks</option>
                  <option value={30}>1 month</option>
                </select>
              </div>
            </div>
          )}

          {hasDraftFiles && !editMode && (
            <p className="text-gray-400 mb-5 px-5">
              {getDraftFileString(draft.mediaFileNames)}
            </p>
          )}

          {/* Link Embeds Preview */}
          {links.length > 0 && (
            <LinkEmbedPreview
              links={links}
              onRemove={handleRemoveLink}
              editable={true}
            />
          )}

          {/* Media Preview */}
          {totalMedia.length > 0 && currentMedia && (
            <div className="mb-10 px-5 relative w-full">
              {isCurrentExisting ? (
                <>
                  {currentMedia.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMedia.url}
                      alt="preview"
                      className="w-full h-auto max-h-[400px] object-contain mx-auto rounded-lg"
                    />
                  )}
                  {currentMedia.type === "video" && (
                    <div className="w-full">
                      <VideoPlayer
                        src={currentMedia.url ? currentMedia.url : ""}
                        controls
                        className="w-full rounded-t-xl"
                      />
                      <div className="bg-neutral-100 rounded-b-xl p-4">
                        <p className="text-sm font-semibold text-neutral-900">
                          {currentMedia.name || "Video file"}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentMedia.type === "file" && (
                    <div className="flex items-center justify-center bg-neutral-100 rounded-xl p-8">
                      <div className="text-center">
                        <Paperclip className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm font-semibold">
                          {currentMedia.name || "File"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {currentMedia.type === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentMedia.previewUrl}
                      alt="preview"
                      className="w-full h-auto max-h-[400px] object-contain mx-auto rounded-lg"
                    />
                  )}
                  {currentMedia.type === "video" && (
                    <div className="w-full">
                      <div className="flex flex-col items-center justify-center bg-neutral-900 rounded-t-xl py-12">
                        <Video className="h-16 w-16 text-white mb-3" />
                        <p className="text-white text-lg font-semibold">
                          ✅ Video Ready to Upload
                        </p>
                      </div>
                      <div className="bg-neutral-100 rounded-b-xl p-4">
                        <p className="text-sm font-semibold text-neutral-900 mb-2">
                          {currentMedia.file?.name || "Video file"}
                        </p>
                        {currentMedia.file && (
                          <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                            <span>
                              Size: {formatFileSize(currentMedia.file.size)}
                            </span>
                            <span>
                              Type: {currentMedia.file.type || "video"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentMedia.type === "file" && (
                    <div className="flex items-center justify-center bg-neutral-100 rounded-xl p-8">
                      <div className="text-center">
                        <Paperclip className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm font-semibold">
                          {currentMedia.file?.name || "File"}
                        </p>
                        {currentMedia.file && (
                          <p className="text-xs text-neutral-500">
                            {(currentMedia.file.size / 1024 / 1024).toFixed(2)}{" "}
                            MB
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {currentMediaIndex > 0 && (
                <button
                  onClick={() => setCurrentMediaIndex((i) => i - 1)}
                  className="cursor-pointer absolute left-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                >
                  <ArrowBigLeft />
                </button>
              )}

              {currentMediaIndex < totalMedia.length - 1 && (
                <button
                  onClick={() => setCurrentMediaIndex((i) => i + 1)}
                  className="cursor-pointer absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition"
                >
                  <ArrowBigRight />
                </button>
              )}

              <button
                onClick={handleRemoveMedia}
                className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/80 transition"
              >
                Remove
              </button>
            </div>
          )}

          <div className="px-6 pb-4">
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

                setNewMedia((prev) => [...prev, ...newItems]);
                e.target.value = "";
              }}
            />

            {postType !== "poll" && postType !== "job_post" && (
              <div className="flex items-center gap-2 text-neutral-500 text-sm bg-neutral-50 rounded-2xl p-4 border border-neutral-200">
                <span className="text-xs font-semibold text-neutral-600 mr-2">
                  Add to your post
                </span>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
                  title="Add image"
                >
                  <ImageIcon className="h-5 w-5 text-green-600" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
                  title="Add video"
                >
                  <Video className="h-5 w-5 text-red-600" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
                  title="Add file"
                >
                  <Paperclip className="h-5 w-5 text-blue-600" />
                </button>

                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="cursor-pointer p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
                  title="Add link"
                >
                  <LinkIcon className="h-5 w-5 text-orange-600" />
                </button>

                <button
                  onClick={() => {
                    window.alert("Feature not yet implemented");
                  }}
                  className="cursor-pointer p-2.5 rounded-xl hover:bg-white hover:shadow-md transition"
                  title="Tag people"
                >
                  <UserPlus className="h-5 w-5 text-purple-600" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-neutral-50">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                disabled={postType === "job_post"}
                checked={disableComments}
                onChange={(e) => setDisableComments(e.target.checked)}
                className="cursor-pointer h-4 w-4"
              />
              <span className="text-sm text-neutral-700">Disable comments</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="cursor-pointer px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-200 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmitPost}
                disabled={!canPost || isSubmitting}
                className={`cursor-pointer px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition ${
                  !canPost || isSubmitting
                    ? "bg-neutral-300 cursor-not-allowed"
                    : "bg-linear-to-r from-blue-600 via-blue-700 to-blue-600 hover:shadow-xl"
                }`}
              >
                {isSubmitting
                  ? editMode
                    ? "Updating..."
                    : "Posting..."
                  : editMode
                    ? "Update"
                    : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onAdd={handleAddLink}
      />
    </>
  );
}
