"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useJobPosts } from "../(main)/profile/utils/jobPostFetchFunctions";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useFeedStore } from "@/lib/stores/feedStore";
import { useQuery } from "@tanstack/react-query";
import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import Post from "../components/Post";
import { MyApplicationSection } from "../components/MyApplicationSection";
import { TRENDING_JOB_SKILLS_API_PATH } from "@/lib/constants";

const sampleJobsRecs = [
  {
    title: "Senior Front End Engineer",
    company: "Google",
    location: "Bangkok, Thailand",
    type: "Remote",
    status: "Open",
    skills: ["React", "CSS", "TypeScript", "Figma"],
  },
  {
    title: "UI/UX Designer",
    company: "Au Connect",
    location: "Bangkok, Thailand",
    type: "Onsite",
    status: "Open",
    skills: ["Figma", "Design Systems"],
  },
];

enum JobTabFilters {
  ALL = "All jobs",
  SAVED = "Saved",
  APPLIED = "Applied",
}

const EMPLOYMENT_FILTERS = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERNSHIP", label: "Internship" },
];

const LOCATION_FILTERS = [
  { value: "REMOTE", label: "Remote" },
  { value: "ONSITE", label: "Onsite" },
  { value: "HYBRID", label: "Hybrid" },
];

const SALARY_SLIDER_MIN = 0;
const SALARY_SLIDER_MAX = 20000;
const SALARY_STEP = 250;

type TrendingSkill = {
  id: string;
  name: string;
  count: number;
  percentage: number;
};

async function fetchTrendingJobSkills() {
  const res = await fetch(`${TRENDING_JOB_SKILLS_API_PATH}?limit=5`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch trending skills");
  }

  const data = (await res.json()) as { skills: TrendingSkill[] };
  return data.skills;
}

export default function JobsPage() {
  // job filters
  const [keyword, setKeyword] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [locationTypes, setLocationTypes] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<number | "">("");
  const [salaryMax, setSalaryMax] = useState<number | "">("");
  const [jobTabFilter, setJobTabFilter] = useState<JobTabFilters>(
    JobTabFilters.ALL,
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const salaryMinValue = salaryMin === "" ? undefined : salaryMin;
  const salaryMaxValue = salaryMax === "" ? undefined : salaryMax;
  const salaryRangeParam =
    salaryMinValue !== undefined || salaryMaxValue !== undefined
      ? `${salaryMinValue ?? ""},${salaryMaxValue ?? ""}`
      : undefined;
  const sliderMinValue = Math.min(
    salaryMinValue ?? SALARY_SLIDER_MIN,
    SALARY_SLIDER_MAX,
  );
  const sliderMaxValue = Math.min(
    salaryMaxValue ?? SALARY_SLIDER_MAX,
    SALARY_SLIDER_MAX,
  );
  const salaryTrackLeft =
    ((sliderMinValue - SALARY_SLIDER_MIN) /
      (SALARY_SLIDER_MAX - SALARY_SLIDER_MIN)) *
    100;
  const salaryTrackRight =
    100 -
    ((sliderMaxValue - SALARY_SLIDER_MIN) /
      (SALARY_SLIDER_MAX - SALARY_SLIDER_MIN)) *
      100;

  // query to fetch job posts
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJobPosts({
    keyword: keyword.trim() || undefined,
    empType: employmentTypes.length ? employmentTypes : undefined,
    locType: locationTypes.length ? locationTypes : undefined,
    salaryRange: salaryRangeParam,
  });

  useEffect(() => {
    console.log("Job posts data updated:", data);
  }, [data]);


  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const {
    data: trendingSkills = [],
    isLoading: trendingSkillsLoading,
    isError: trendingSkillsError,
  } = useQuery({
    queryKey: ["trending-job-skills"],
    queryFn: fetchTrendingJobSkills,
  });

  const virtuosoRef = useRef<VirtuosoHandle>(null!);
  const setVirtuosoRef = useFeedStore((s) => s.setVirtuosoRef);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // flatten pages
  const jobs = data?.pages.flatMap((page) => page.jobs);

  // TODO: add skills filter
  const hasSelectedFilters =
    keyword.trim().length > 0 ||
    employmentTypes.length > 0 ||
    locationTypes.length > 0 ||
    salaryMinValue !== undefined ||
    salaryMaxValue !== undefined;

  const toggleFilter = (
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
  ) => {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selected) => selected !== value)
        : [...selectedValues, value],
    );
  };

  const clearFilters = () => {
    setKeyword("");
    setEmploymentTypes([]);
    setLocationTypes([]);
    setSalaryMin("");
    setSalaryMax("");
  };

  const updateSalaryMin = (value: number | "") => {
    if (value === "") {
      setSalaryMin("");
      return;
    }

    const nextValue = Math.max(0, value);
    setSalaryMin(nextValue);
    if (salaryMax !== "" && nextValue > salaryMax) {
      setSalaryMax(nextValue);
    }
  };

  const updateSalaryMax = (value: number | "") => {
    if (value === "") {
      setSalaryMax("");
      return;
    }

    const nextValue = Math.max(0, value);
    setSalaryMax(nextValue);
    if (salaryMin !== "" && nextValue < salaryMin) {
      setSalaryMin(nextValue);
    }
  };

  const JobRecommendationCard = () => {
    return (
      <>
        {/* Recommendations */}
        <div className="bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg sm:shadow-xl">
          <div className="flex items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <p className="text-sm text-red-600 mb-1">
                ✨ Recommended for you
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold">Top matches</h2>
            </div>

            <button className="shrink-0 border border-zinc-200 px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl hover:bg-zinc-100 transition text-sm sm:text-base">
              See all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 cursor-pointer">
            {sampleJobsRecs.map((job, i) => (
              <div
                key={i}
                className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5 hover:border-red-400/40 transition"
              >
                <div className="mb-4">
                  <p className="text-zinc-500 text-sm">{job.company}</p>
                  <h3 className="text-lg sm:text-xl font-semibold leading-tight mt-1">
                    {job.title}
                  </h3>
                </div>

                <div className="space-y-1 text-sm text-zinc-500 mb-4">
                  <p>{job.location}</p>
                  <p>{job.type}</p>
                </div>

                <div className="inline-flex px-3 py-1 rounded-full bg-green-50 text-green-500 border border-green-400 text-sm">
                  95% match
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-5" />

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
            {Object.values(JobTabFilters).map((filter) => (
              <button
                key={filter}
                onClick={() => setJobTabFilter(filter)}
                className={`shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border transition ${
                  jobTabFilter === filter
                    ? "bg-red-100 border-red-500 text-red-500"
                    : "bg-white border-zinc-200 text-gray-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            className="self-start sm:self-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border transition bg-white border-zinc-200 text-gray-600"
          >
            Most recent
          </button>
        </div>

        {/* the little updating loading circle*/}
        {isFetching && !isFetchingNextPage && data && (
          <div className="w-full flex justify-center items-center">
            <div className="mt-4 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 shadow-sm w-fit">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-200 border-t-red-500" />
              Updating
            </div>
          </div>
        )}

        <div className="h-5" />
      </>
    );
  };

  // TODO: handle errors and loading more gracefully
  if (isLoading && !data) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>{(error as Error).message}</div>;
  }

  if (!data) {
    return <div>loading error...</div>;
  }

  if (!jobs) {
    return <div>loading error...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-zinc-900 px-3 py-4 sm:p-5 xl:p-6">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-12 xl:gap-6">
        {/* Left Sidebar */}
        <aside className="space-y-4 sm:space-y-6 md:col-span-4 xl:col-span-3">
          <button
            type="button"
            aria-expanded={mobileFiltersOpen}
            aria-controls="job-filters"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-medium shadow-sm md:hidden"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={18} />
              Filter jobs
              {hasSelectedFilters && (
                <span className="h-2 w-2 rounded-full bg-red-500" />
              )}
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            id="job-filters"
            className={`${mobileFiltersOpen ? "block" : "hidden"} bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg sm:shadow-xl md:block`}
          >
            <h2 className="text-sm tracking-wide text-zinc-500 mb-5 uppercase font-semibold">
              Filter Jobs
            </h2>

            <div className="mb-6">
              <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-2xl px-4 py-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Keyword, skill, role..."
                  className="bg-transparent outline-none w-full text-sm placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 text-zinc-700">
                  Employment type
                </h3>
                <div className="space-y-3 text-zinc-500">
                  {EMPLOYMENT_FILTERS.map((item) => (
                    <label
                      key={item.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-red-400"
                        checked={employmentTypes.includes(item.value)}
                        onChange={() =>
                          toggleFilter(
                            item.value,
                            employmentTypes,
                            setEmploymentTypes,
                          )
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-zinc-700">
                  Location type
                </h3>
                <div className="space-y-3 text-zinc-500">
                  {LOCATION_FILTERS.map((item) => (
                    <label
                      key={item.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-red-400"
                        checked={locationTypes.includes(item.value)}
                        onChange={() =>
                          toggleFilter(
                            item.value,
                            locationTypes,
                            setLocationTypes,
                          )
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-zinc-700">Salary (USD/mo)</h3>
                  <span className="text-sm text-zinc-500">
                    {salaryMinValue !== undefined ||
                    salaryMaxValue !== undefined
                      ? `$${salaryMinValue ?? 0} - ${
                          salaryMaxValue !== undefined
                            ? `$${salaryMaxValue}`
                            : "Any"
                        }`
                      : "Any"}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="relative h-6">
                    <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-zinc-200" />
                    <div
                      className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-red-400"
                      style={{
                        left: `${salaryTrackLeft}%`,
                        right: `${salaryTrackRight}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={SALARY_SLIDER_MIN}
                      max={SALARY_SLIDER_MAX}
                      step={SALARY_STEP}
                      value={sliderMinValue}
                      onChange={(e) => updateSalaryMin(Number(e.target.value))}
                      className="pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent accent-red-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                    />
                    <input
                      type="range"
                      min={SALARY_SLIDER_MIN}
                      max={SALARY_SLIDER_MAX}
                      step={SALARY_STEP}
                      value={sliderMaxValue}
                      onChange={(e) => updateSalaryMax(Number(e.target.value))}
                      className="pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent accent-red-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-zinc-500">
                      Min
                      <input
                        type="number"
                        min={0}
                        value={salaryMin}
                        onChange={(e) =>
                          updateSalaryMin(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="No min"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-red-400"
                      />
                    </label>
                    <label className="text-xs font-medium text-zinc-500">
                      Max
                      <input
                        type="number"
                        min={0}
                        value={salaryMax}
                        onChange={(e) =>
                          updateSalaryMax(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="No max"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-red-400"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-zinc-700">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "React",
                    "CSS",
                    "Go",
                    "Python",
                    "Node.js",
                    "SQL",
                    "Docker",
                    "TypeScript",
                  ].map((skill, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1.5 rounded-full border text-sm transition ${
                        i < 2
                          ? "bg-red-500/10 text-red-300 border-red-400/40"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {hasSelectedFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full mt-4 border border-zinc-200 rounded-2xl py-3 bg-white hover:bg-gray-100 transition"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 space-y-4 sm:space-y-6 md:col-span-8 xl:col-span-6">
          {/* Job Cards */}
          <div className="h-[calc(100dvh-5.5rem)] min-h-[34rem] md:h-[calc(100vh-97px)]">
            <Virtuoso
              ref={(ref) => {
                if (ref) {
                  virtuosoRef.current = ref;
                  setVirtuosoRef(virtuosoRef);
                }
              }}
              data={jobs}
              endReached={loadMore}
              overscan={200}
              components={{
                Header: JobRecommendationCard,
              }}
              itemContent={(_, post) => (
                <>
                  <Post
                    key={post.id}
                    user={user}
                    post={post}
                    isLoading={false}
                  />

                  <div className="h-5" />
                </>
              )}
            />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:col-span-12 xl:col-span-3 xl:block xl:space-y-6">
          <MyApplicationSection />

          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
            <h2 className="font-semibold text-lg mb-6">Trending skills</h2>

            <div className="space-y-5">
              {trendingSkillsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
                        <div className="h-4 w-10 animate-pulse rounded bg-zinc-200" />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200" />
                    </div>
                  ))}
                </div>
              ) : trendingSkillsError ? (
                <p className="text-sm text-zinc-500">
                  Trending skills are unavailable.
                </p>
              ) : trendingSkills.length > 0 ? (
                trendingSkills.map((skill) => (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span>{skill.name}</span>
                      <span className="text-zinc-500 text-sm">
                        {skill.count}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-red-400 to-red-500"
                        style={{ width: `${skill.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  No trending skills yet.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
