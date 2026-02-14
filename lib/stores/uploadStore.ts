import { create } from "zustand";
import { MediaItem } from "@/types/Media";
import { PostMediaWithUrl } from "@/types/PostMedia";
import LinkEmbed from "@/types/LinkEmbeds";
import JobDraft from "@/types/JobDraft";

export interface UploadJob {
  // core
  id: string;
  postType: string;
  title: string;
  content: string;
  visibility: string;
  disableComments: boolean;

  // NEW MEDIA ONLY (files)
  media: MediaItem[];

  // links
  links?: LinkEmbed[];

  // poll
  pollOptions?: string[];
  pollDuration?: number;

  // job
  job?: JobDraft;

  // edit-only
  isEdit?: boolean;
  postId?: string;
  existingMedia?: PostMediaWithUrl[]; // authoritative, already-uploaded media

  // status
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  error?: string;
}

interface UploadStore {
  jobs: UploadJob[];
  addJob: (job: Omit<UploadJob, "id" | "status" | "progress">) => string;
  updateJobProgress: (id: string, progress: number) => void;
  updateJobStatus: (id: string, status: UploadJob["status"]) => void;
  setJobError: (id: string, error: string) => void;
  removeJob: (id: string) => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  jobs: [],

  addJob: (job) => {
    const id = crypto.randomUUID();
    set((state) => ({
      jobs: [...state.jobs, { ...job, id, status: "pending", progress: 0 }],
    }));
    return id;
  },

  updateJobProgress: (id, progress) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, progress } : j)),
    })),

  updateJobStatus: (id, status) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, status } : j)),
    })),

  setJobError: (id, error) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, status: "error", error } : j,
      ),
    })),

  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    })),
}));
