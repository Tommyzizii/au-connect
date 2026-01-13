"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pencil, Camera } from "lucide-react";

import SectionCard from "./SectionCard";
import ExperienceItem from "./ExperienceItem";
import EducationItem from "./EducationItem";
import RecommendedList from "./RecommendedList";
import RecommendedModal from "./RecommendedModal";
import EditProfileModal from "./EditProfileModal";
import ExperienceManagerModal from "./ExperienceManagerModal";
import EducationManagerModal from "./EducationManagerModal"; 

import Post from "@/app/components/Post";
import User from "@/types/User";
import Experience from "@/types/Experience";
import Education from "@/types/Education"; 
import PostType from "@/types/Post";

export default function ProfileView({
  user,
  recommendedPeople,
  isOwner,
}: {
  user: User;
  // TODO: type needs to be fixed
  recommendedPeople: Array<number>;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState("posts");
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openExperienceModal, setOpenExperienceModal] = useState(false);
  const [openEducationModal, setOpenEducationModal] = useState(false); 
  const [loading, setLoading] = useState(true);

  // EXISTING EXPERIENCE STATE (UNCHANGED)
  const [experience, setExperience] = useState<Experience[]>(
    user.experience ?? []
  );

  // ADD EDUCATION STATE (MIRROR EXPERIENCE)
  const [education, setEducation] = useState<Education[]>(
    user.education ?? []
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6 overflow-y-auto">
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT MAIN CONTENT */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* PROFILE HEADER */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="relative h-56 w-full bg-gray-200">
                <Image
                  src={user.coverPhoto || "/default_cover.jpg"}
                  alt="cover photo"
                  fill
                  className="object-cover"
                />
                {isOwner && (
                  <button className="absolute top-3 right-3 bg-white/80 p-2 rounded-full shadow">
                    <Camera size={18} className="text-gray-700" />
                  </button>
                )}
              </div>

              <div className="relative p-4">
                <div className="absolute top-4 right-4 flex items-center gap-3">
                  {isOwner ? (
                    <button
                      onClick={() => setOpenEditModal(true)}
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 bg-white"
                    >
                      <Pencil size={16} />
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      className="flex items-center gap-2 px-4 py-2 border rounded-lg text-blue-600 border-blue-600 hover:bg-blue-50 bg-white"
                    >
                      Connect
                    </button>
                  )}
                </div>


                <div className="relative -mt-16 w-32 h-32">
                  <Image
                    src={user.profilePic || "/default_profile.jpg"}
                    alt="avatar"
                    fill
                    className="rounded-full border-4 border-white object-cover"
                  />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mt-2">
                  {user.username}
                </h1>

                <p className="text-gray-700">{user.title}</p>

                <p className="text-sm text-gray-600 mt-1">
                  {user.location}
                </p>

                <p className="text-sm text-gray-600">
                  {user.connections} connections
                </p>
              </div>
            </div>

            {/* EXPERIENCE */}
            <SectionCard
              title="Experience"
              icon={
                isOwner && (
                  <button
                    onClick={() => setOpenExperienceModal(true)}
                    className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil size={18} />
                  </button>
                )
              }
            >
              {experience.length > 0 ? (
                experience.map((exp) => (
                  <ExperienceItem key={exp.id} {...exp} />
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No experience added yet.
                </p>
              )}
            </SectionCard>

            {/* EDUCATION */}
            <SectionCard
              title="Education"
              icon={
                isOwner && (
                  <button
                    onClick={() => setOpenEducationModal(true)}
                    className="p-2 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil size={18} />
                  </button>
                )
              }
            >
              {education.length > 0 ? (
                education.map((edu) => (
                  <EducationItem key={edu.id} {...edu} />
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No education added yet.
                </p>
              )}
            </SectionCard>

            {/* ABOUT */}
            <SectionCard title="About" icon={isOwner && <Pencil size={18} />}>
              <p className="text-sm text-gray-700">
                {user.about || "This user has not added an about section yet."}
              </p>
            </SectionCard>

            {/* ACTIVITY */}
            <SectionCard title="Activity">
              <p className="text-sm text-gray-600 mb-3">
                {user.connections} connections
              </p>

              <div className="flex gap-4 border-b pb-2">
                {["posts", "videos", "images", "documents"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`pb-2 capitalize ${tab === t
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                {tab === "posts" ? (
                  user.posts?.map((p: PostType) => (
                    <Post key={p.id} post={p} isLoading={loading} />
                  ))
                ) : (
                  <div className="text-center text-gray-600 py-10">
                    No {tab} yet
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="hidden lg:block col-span-4 space-y-4 sticky top-20">
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold text-gray-900 mb-3">
                People you may be interested in
              </h2>

              <RecommendedList users={recommendedPeople} limit={4} />

              <button
                onClick={() => setOpenModal(true)}
                className="mt-4 text-sm text-blue-600 font-semibold"
              >
                Show more
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <RecommendedModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        users={recommendedPeople}
      />

      <EditProfileModal
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        user={user}
      />

      <ExperienceManagerModal
        open={openExperienceModal}
        onClose={() => setOpenExperienceModal(false)}
        experiences={experience}
        setExperiences={setExperience}
      />

      {/* ADD EDUCATION MANAGER MODAL */}
      <EducationManagerModal
        open={openEducationModal}
        onClose={() => setOpenEducationModal(false)}
        education={education}
        setEducation={setEducation}
      />
    </>
  );
}
