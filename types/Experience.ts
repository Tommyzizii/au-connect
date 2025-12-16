export type Experience = {
  id: string;

  title: string;
  employmentType: "Full-time" | "Part-time" | "Freelance" | "Internship";
  company: string;

  startMonth: number;
  startYear: number;

  endMonth?: number;
  endYear?: number;

  isCurrent: boolean;
};

export default Experience;
