type JobDraft = {
  id: string;
  jobTitle: string;
  companyName?: string;
  location?: string;
  locationType?: "ONSITE" | "REMOTE" | "HYBRID" | "";
  employmentType: "FULL_TIME" | "PART_TIME" | "FREELANCE" | "INTERNSHIP" | "";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  deadline?: string;
  jobDetails?: string;
  jobRequirements?: string[];
  allowExternalApply: boolean;
  applyUrl?: string;

  // application status
  hasApplied?: boolean;
  applicationStatus?: "APPLIED" | "SHORTLISTED" | "REJECTED";
};

export default JobDraft;
