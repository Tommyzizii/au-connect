import { create } from "zustand";
import { MediaItem } from "@/types/Media";

export interface UploadJob {
  id: string;
  postType: string;
  title: string;
  content: string;
  visibility: string;
  disableComments: boolean;
  media: MediaItem[];
  status: "pending" | "uploading" | "complete" | "error";
  progress: number; // 0-100
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
