import JobDraft from "@/types/JobDraft";

export type JobDraftErrors = Partial<Record<keyof JobDraft | "salaryRange", string>>;

export function validateJobDraft(job: JobDraft): JobDraftErrors {
  const errors: JobDraftErrors = {};

  if (!job.jobTitle?.trim()) {
    errors.jobTitle = "Job title is required";
  }

  if (!job.companyName?.trim()) {
    errors.companyName = "Company name is required";
  }

  if (!job.location?.trim()) {
    errors.location = "Location is required";
  }

  if (!job.locationType) {
    errors.locationType = "Work type is required";
  }

  if (!job.employmentType) {
    errors.employmentType = "Employment type is required";
  }

  // deadline
  if (!job.deadline) {
    errors.deadline = "Application deadline is required";
  } else {
    const selected = new Date(job.deadline);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (selected < tomorrow) {
      errors.deadline = "Deadline must be at least one day in future";
    }
  }

  // salary
  if (job.salaryMin && job.salaryMax && job.salaryMin > job.salaryMax) {
    errors.salaryRange = "Minimum salary cannot exceed maximum salary";
  }

  if (job.salaryMin && job.salaryMin < 0) {
    errors.salaryMin = "Salary cannot be negative";
  }

  if (job.salaryMax && job.salaryMax < 0) {
    errors.salaryMax = "Salary cannot be negative";
  }

  // external apply
  if (job.allowExternalApply && !job.applyUrl?.trim()) {
    errors.applyUrl = "Apply URL required when external apply enabled";
  }

  return errors;
}