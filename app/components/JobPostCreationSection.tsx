// "use client";
// // mine

// import {
//   Building2,
//   MapPin,
//   Briefcase,
//   DollarSign,
//   Calendar,
//   Globe,
//   ExternalLink,
// } from "lucide-react";
// import { useState } from "react";

// import JobDraft from "@/types/JobDraft";

// export default function JobPostCreationSection({
//   value,
//   onChange,
//   errors={},
// }: {
//   value: JobDraft;
//   onChange: (value: JobDraft) => void;
//   errors?: Record<string, string>;
// }) {
//   const {
//     jobTitle,
//     companyName,
//     location,
//     locationType,
//     employmentType,
//     salaryMin,
//     salaryMax,
//     salaryCurrency,
//     deadline,
//     jobDetails,
//     applyUrl,
//     allowExternalApply,
//   } = value;

//   const jobRequirements = value.jobRequirements ?? [];

//   const update = <K extends keyof JobDraft>(key: K, val: JobDraft[K]) => {
//     onChange({ ...value, [key]: val });
//   };
//   const [skillInput, setSkillInput] = useState("");

//   return (
//     <div className="px-6 py-4 bg-blue-50/30 border-y border-blue-100">
//       {/* Header */}
//       <div className="flex items-center gap-2 mb-4">
//         <Briefcase className="h-5 w-5 text-blue-600" />
//         <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">
//           Job Details
//         </h3>
//       </div>

//       <div className="space-y-4">
//         {/* Job Title - Required */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Job Title <span className="text-red-500">*</span>
//           </label>
//           <div className="relative">
//             <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//             <input
//               type="textarea"
//               value={jobTitle}
//               onChange={(e) => update("jobTitle", e.target.value)}
//               placeholder="e.g. Senior Frontend Developer"
//               className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//               required
//             />
//           </div>
//         </div>

//         {/* Company Name */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Company Name <span className="text-neutral-400">(optional)</span>
//           </label>
//           <div className="relative">
//             <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//             <input
//               type="text"
//               value={companyName}
//               onChange={(e) => update("companyName", e.target.value)}
//               placeholder="e.g. TechCorp Inc."
//               className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//             />
//           </div>
//           <p className="text-xs text-neutral-500 mt-1.5">
//             {/* Leave blank to show "Posted by [your name]" */}
//           </p>
//         </div>

//         {/* Location & Location Type - Side by Side */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-xs font-semibold text-neutral-700 mb-2">
//               Location
//             </label>
//             <div className="relative">
//               <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//               <input
//                 type="text"
//                 value={location}
//                 onChange={(e) => update("location", e.target.value)}
//                 placeholder="e.g. San Francisco, CA"
//                 className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//               />
//             </div>
//           </div>

//           <div>
//             <label className="block text-xs font-semibold text-neutral-700 mb-2">
//               Work Type
//             </label>
//             <div className="relative">
//               <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//               <select
//                 value={locationType}
//                 onChange={(e) =>
//                   update(
//                     "locationType",
//                     e.target.value as "ONSITE" | "REMOTE" | "HYBRID",
//                   )
//                 }
//                 className="cursor-pointer w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white appearance-none"
//               >
//                 <option value="">Select type</option>
//                 <option value="ONSITE">On-site</option>
//                 <option value="REMOTE">Remote</option>
//                 <option value="HYBRID">Hybrid</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Employment Type - Required */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Employment Type <span className="text-red-500">*</span>
//           </label>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
//             {[
//               { value: "FULL_TIME", label: "Full-time" },
//               { value: "PART_TIME", label: "Part-time" },
//               { value: "FREELANCE", label: "Freelance" },
//               { value: "INTERNSHIP", label: "Internship" },
//             ].map((type) => (
//               <button
//                 key={type.value}
//                 type="button"
//                 onClick={() =>
//                   update(
//                     "employmentType",
//                     type.value as
//                       | "FULL_TIME"
//                       | "PART_TIME"
//                       | "FREELANCE"
//                       | "INTERNSHIP",
//                   )
//                 }
//                 className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
//                   employmentType === type.value
//                     ? "bg-blue-600 text-white shadow-md"
//                     : "bg-white border border-neutral-200 text-neutral-700 hover:border-blue-300 hover:bg-blue-50"
//                 }`}
//               >
//                 {type.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Number of Positions (Optional) */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Number of Positions
//             <span className="text-neutral-400"> (optional)</span>
//           </label>

//           <input
//             type="number"
//             min={1}
//             value={value.positionsAvailable ?? ""}
//             onChange={(e) =>
//               update(
//                 "positionsAvailable",
//                 e.target.value === "" ? undefined : Number(e.target.value),
//               )
//             }
//             placeholder="e.g. 3"
//             className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//           />

//           <p className="text-xs text-neutral-500 mt-1.5">
//             If filled positions reach this number, job can automatically become
//             FILLED
//           </p>
//         </div>

//         {/* Salary Range - Optional */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Salary Range{" "}
//             <span className="text-neutral-400">(optional but encouraged)</span>
//           </label>
//           <div className="flex items-center gap-3">
//             <div className="flex-1 relative">
//               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//               <input
//                 type="number"
//                 value={salaryMin ?? ""}
//                 onChange={(e) =>
//                   update(
//                     "salaryMin",
//                     e.target.value === "" ? undefined : Number(e.target.value),
//                   )
//                 }
//                 placeholder="Min"
//                 className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//               />
//             </div>
//             <span className="text-neutral-400 font-semibold">—</span>
//             <div className="flex-1 relative">
//               <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//               <input
//                 type="number"
//                 value={salaryMax ?? ""}
//                 onChange={(e) =>
//                   update(
//                     "salaryMax",
//                     e.target.value === "" ? undefined : Number(e.target.value),
//                   )
//                 }
//                 placeholder="Max"
//                 className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//               />
//             </div>
//             <select
//               value={salaryCurrency}
//               onChange={(e) => update("salaryCurrency", e.target.value)}
//               className="cursor-pointer px-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
//             >
//               <option value="USD">USD</option>
//               <option value="EUR">EUR</option>
//               <option value="GBP">GBP</option>
//               <option value="CAD">CAD</option>
//               <option value="AUD">AUD</option>
//             </select>
//           </div>
//           <p className="text-xs text-neutral-500 mt-1.5">
//             Including salary increases trust and attracts better candidates
//           </p>
//         </div>

//         {/* Job Details */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Job Details
//           </label>

//           <textarea
//             value={jobDetails || ""}
//             onChange={(e) => update("jobDetails", e.target.value)}
//             placeholder="Describe responsibilities, expectations, team structure, and what the candidate will be working on..."
//             rows={10}
//             className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
//           />

//           <p className="text-xs text-neutral-500 mt-1.5">
//             This will appear in the detailed job view
//           </p>
//         </div>

//         {/* Required Skills */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Required Skills
//           </label>

//           <div className="border border-neutral-200 rounded-xl px-3 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
//             <div className="flex flex-wrap gap-2 mb-2">
//               {value.jobRequirements?.map((skill, index) => (
//                 <div
//                   key={index}
//                   className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700"
//                 >
//                   {skill}
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const updated = jobRequirements.filter(
//                         (_, i) => i !== index,
//                       );
//                       update("jobRequirements", updated);
//                     }}
//                     className="text-neutral-500 hover:text-red-500"
//                   >
//                     ✕
//                   </button>
//                 </div>
//               ))}
//             </div>

//             <input
//               type="text"
//               value={skillInput}
//               onChange={(e) => setSkillInput(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter" && skillInput.trim() !== "") {
//                   e.preventDefault();
//                   if (!jobRequirements.includes(skillInput.trim())) {
//                     update("jobRequirements", [
//                       ...jobRequirements,
//                       skillInput.trim(),
//                     ]);
//                   }
//                   setSkillInput("");
//                 }
//               }}
//               placeholder="Type a skill and press Enter"
//               className="w-full text-sm outline-none text-gray-700"
//             />
//           </div>

//           <p className="text-xs text-neutral-500 mt-1.5">
//             Press Enter to add each skill
//           </p>
//         </div>

//         {/* Application Deadline */}
//         <div>
//           <label className="block text-xs font-semibold text-neutral-700 mb-2">
//             Application Deadline{" "}
//             <span className="text-neutral-400">(optional)</span>
//           </label>
//           <div className="relative">
//             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//             <input
//               type="date"
//               value={deadline}
//               onChange={(e) => update("deadline", e.target.value)}
//               className="cursor-pointer w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//             />
//           </div>
//         </div>

//         {/* External Apply URL */}
//         <div className="pt-2 border-t border-neutral-200">
//           <div className="flex items-center gap-2 mb-3">
//             <input
//               type="checkbox"
//               id="external-apply"
//               checked={allowExternalApply}
//               onChange={(e) => update("allowExternalApply", e.target.checked)}
//               className="cursor-pointer h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-100"
//             />
//             <label
//               htmlFor="external-apply"
//               className="cursor-pointer text-sm font-semibold text-neutral-700"
//             >
//               Accept applications via external link
//             </label>
//           </div>

//           {allowExternalApply && (
//             <div className="relative">
//               <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
//               <input
//                 type="url"
//                 value={applyUrl}
//                 onChange={(e) => update("applyUrl", e.target.value)}
//                 placeholder="https://your-company.com/careers/apply"
//                 className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
//               />
//               <p className="text-xs text-neutral-500 mt-1.5">
//                 Applicants will be redirected to this URL instead of applying
//                 through the platform
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Info Box */}
//         <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
//           <p className="text-xs font-semibold text-blue-900 mb-1">
//             💡 Job Post Best Practices
//           </p>
//           <ul className="text-xs text-blue-800 space-y-1">
//             <li>• Clear job titles get 3x more applications</li>
//             <li>
//               • Posts with salary info receive 50% more qualified candidates
//             </li>
//             <li>• Job descriptions go in the main content area below</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import {
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";

import JobDraft from "@/types/JobDraft";

export default function JobPostCreationSection({
  value,
  onChange,
  errors = {},
}: {
  value: JobDraft;
  onChange: (value: JobDraft) => void;
  errors?: Record<string, string>;
}) {
  const {
    jobTitle,
    companyName,
    location,
    locationType,
    employmentType,
    salaryMin,
    salaryMax,
    salaryCurrency,
    deadline,
    jobDetails,
    applyUrl,
    allowExternalApply,
  } = value;

  const jobRequirements = value.jobRequirements ?? [];

  const minDeadline = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const update = <K extends keyof JobDraft>(key: K, val: JobDraft[K]) => {
    onChange({ ...value, [key]: val });
  };
  const [skillInput, setSkillInput] = useState("");

  return (
    <div className="px-6 py-4 bg-blue-50/30 border-y border-blue-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">
          Job Details
        </h3>
      </div>

      <div className="space-y-4">
        {/* Job Title - Required */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Job Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                errors.jobTitle
                  ? "border-red-500 focus:ring-red-100"
                  : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
          </div>
          {errors.jobTitle && (
            <p className="text-xs text-red-500 mt-1">{errors.jobTitle}</p>
          )}
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Company Name <span className="text-neutral-400">(optional)</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => update("companyName", e.target.value)}
              placeholder="e.g. TechCorp Inc."
              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                errors.companyName
                  ? "border-red-500 focus:ring-red-100"
                  : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
          </div>
          {errors.companyName && (
            <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>
          )}
        </div>

        {/* Location & Location Type - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                  errors.location
                    ? "border-red-500 focus:ring-red-100"
                    : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
            </div>
            {errors.location && (
              <p className="text-xs text-red-500 mt-1">{errors.location}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Work Type
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <select
                value={locationType}
                onChange={(e) =>
                  update(
                    "locationType",
                    e.target.value as "ONSITE" | "REMOTE" | "HYBRID",
                  )
                }
                className={`cursor-pointer w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition bg-white appearance-none ${
                  errors.locationType
                    ? "border-red-500 focus:ring-red-100"
                    : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              >
                <option value="">Select type</option>
                <option value="ONSITE">On-site</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            {errors.locationType && (
              <p className="text-xs text-red-500 mt-1">{errors.locationType}</p>
            )}
          </div>
        </div>

        {/* Employment Type - Required */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Employment Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: "FULL_TIME", label: "Full-time" },
              { value: "PART_TIME", label: "Part-time" },
              { value: "FREELANCE", label: "Freelance" },
              { value: "INTERNSHIP", label: "Internship" },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() =>
                  update(
                    "employmentType",
                    type.value as
                      | "FULL_TIME"
                      | "PART_TIME"
                      | "FREELANCE"
                      | "INTERNSHIP",
                  )
                }
                className={`cursor-pointer px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                  employmentType === type.value
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white border border-neutral-200 text-neutral-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
          {errors.employmentType && (
            <p className="text-xs text-red-500 mt-1">{errors.employmentType}</p>
          )}
        </div>

        {/* Number of Positions (Optional) */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Number of Positions
            <span className="text-neutral-400"> (optional)</span>
          </label>

          <input
            type="number"
            min={1}
            value={value.positionsAvailable ?? ""}
            onChange={(e) =>
              update(
                "positionsAvailable",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            placeholder="e.g. 3"
            className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
              errors.positionsAvailable
                ? "border-red-500 focus:ring-red-100"
                : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
            }`}
          />
          {errors.positionsAvailable && (
            <p className="text-xs text-red-500 mt-1">
              {errors.positionsAvailable}
            </p>
          )}

          <p className="text-xs text-neutral-500 mt-1.5">
            If filled positions reach this number, job can automatically become
            FILLED
          </p>
        </div>

        {/* Salary Range - Optional */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Salary Range{" "}
            <span className="text-neutral-400">(optional but encouraged)</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="number"
                value={salaryMin ?? ""}
                onChange={(e) =>
                  update(
                    "salaryMin",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                placeholder="Min"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                  errors.salaryMin
                    ? "border-red-500 focus:ring-red-100"
                    : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
            </div>
            <span className="text-neutral-400 font-semibold">—</span>
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="number"
                value={salaryMax ?? ""}
                onChange={(e) =>
                  update(
                    "salaryMax",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                placeholder="Max"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                  errors.salaryMax
                    ? "border-red-500 focus:ring-red-100"
                    : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
            </div>
            <select
              value={salaryCurrency}
              onChange={(e) => update("salaryCurrency", e.target.value)}
              className="cursor-pointer px-4 py-3 border border-neutral-200 rounded-xl text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition bg-white"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          {errors.salaryRange && (
            <p className="text-xs text-red-500 mt-1">{errors.salaryRange}</p>
          )}
          <p className="text-xs text-neutral-500 mt-1.5">
            Including salary increases trust and attracts better candidates
          </p>
        </div>

        {/* Job Details */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Job Details
          </label>

          <textarea
            value={jobDetails || ""}
            onChange={(e) => update("jobDetails", e.target.value)}
            placeholder="Describe responsibilities, expectations, team structure, and what the candidate will be working on..."
            rows={10}
            className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition resize-none ${
              errors.jobDetails
                ? "border-red-500 focus:ring-red-100"
                : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
            }`}
          />
          {errors.jobDetails && (
            <p className="text-xs text-red-500 mt-1">{errors.jobDetails}</p>
          )}

          <p className="text-xs text-neutral-500 mt-1.5">
            This will appear in the detailed job view
          </p>
        </div>

        {/* Required Skills */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Required Skills
          </label>

          <div
            className={`border rounded-xl px-3 py-3 focus-within:ring-2 transition ${
              errors.jobRequirements
                ? "border-red-500 focus-within:ring-red-100"
                : "border-neutral-200 focus-within:border-blue-500 focus-within:ring-blue-100"
            }`}
          >
            <div className="flex flex-wrap gap-2 mb-2">
              {value.jobRequirements?.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = jobRequirements.filter(
                        (_, i) => i !== index,
                      );
                      update("jobRequirements", updated);
                    }}
                    className="text-neutral-500 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skillInput.trim() !== "") {
                  e.preventDefault();
                  if (!jobRequirements.includes(skillInput.trim())) {
                    update("jobRequirements", [
                      ...jobRequirements,
                      skillInput.trim(),
                    ]);
                  }
                  setSkillInput("");
                }
              }}
              placeholder="Type a skill and press Enter"
              className="w-full text-sm outline-none text-gray-700"
            />
          </div>
          {errors.jobRequirements && (
            <p className="text-xs text-red-500 mt-1">
              {errors.jobRequirements}
            </p>
          )}

          <p className="text-xs text-neutral-500 mt-1.5">
            Press Enter to add each skill
          </p>
        </div>

        {/* Application Deadline */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Application Deadline{" "}
            <span className="text-neutral-400">(optional)</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="date"
              value={deadline}
              min={minDeadline}
              onChange={(e) => update("deadline", e.target.value)}
              className={`cursor-pointer w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                errors.deadline
                  ? "border-red-500 focus:ring-red-100"
                  : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
          </div>
          {errors.deadline && (
            <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>
          )}
        </div>

        {/* External Apply URL */}
        <div className="pt-2 border-t border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="external-apply"
              checked={allowExternalApply}
              onChange={(e) => update("allowExternalApply", e.target.checked)}
              className="cursor-pointer h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <label
              htmlFor="external-apply"
              className="cursor-pointer text-sm font-semibold text-neutral-700"
            >
              Accept applications via external link
            </label>
          </div>

          {allowExternalApply && (
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="url"
                value={applyUrl}
                onChange={(e) => update("applyUrl", e.target.value)}
                placeholder="https://your-company.com/careers/apply"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-700 outline-none focus:ring-2 transition ${
                  errors.applyUrl
                    ? "border-red-500 focus:ring-red-100"
                    : "border-neutral-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {errors.applyUrl && (
                <p className="text-xs text-red-500 mt-1">{errors.applyUrl}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1.5">
                Applicants will be redirected to this URL instead of applying
                through the platform
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-900 mb-1">
            💡 Job Post Best Practices
          </p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Clear job titles get 3x more applications</li>
            <li>
              • Posts with salary info receive 50% more qualified candidates
            </li>
            <li>• Job descriptions go in the main content area below</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
