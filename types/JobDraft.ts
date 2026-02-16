type JobDraft = {
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
};

export default JobDraft;
