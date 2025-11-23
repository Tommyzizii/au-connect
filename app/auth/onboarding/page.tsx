"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, ChangeEvent } from "react";

export default function OnBoardingPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    userType: "AU Student", // NEW FIELD

    fullName: "",
    faculty: "",
    major: "",
    intakeYear: "",
    graduationYear: "",

    workFrom: "",
    workTo: "",
  });

  const handleYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setForm((prev) => ({ ...prev, [e.target.name]: digitsOnly }));
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", form);
    alert("Form submitted!");
    router.push("/");
  };

  return (
    <div className="relative min-h-screen flex">

      {/* MOBILE BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 md:hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/signUp.png')" }}
      >
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* DESKTOP LEFT IMAGE */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: "url('/signUp.png')" }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex items-end p-10">
          <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
            Welcome to <span className="block mt-2">AU Connect</span>
          </h1>
        </div>
      </div>

      {/* FORM SECTION */}
      <div
        className="
          relative z-10 
          flex items-center justify-center
          w-full md:w-1/2
          px-4 py-10 md:p-0
          bg-white/0 md:bg-zinc-50
          backdrop-blur-sm md:backdrop-blur-none
        "
      >
        {/* CENTERED FORM CARD */}
        <div
          className="
            w-full

            /* MOBILE  */
            max-w-xs
            bg-white/90 backdrop-blur-xl
            border border-white/40
            rounded-3xl
            p-4

            /* DESKTOP  */
            md:max-w-md
            md:bg-white md:backdrop-blur-none
            md:border-zinc-200
            md:rounded-2xl
            md:p-10
            md:shadow-xl

            mx-auto my-10 md:my-0
            space-y-5
          "
        >

          {/* HEADER */}
          <div>
            <p className="text-xs uppercase tracking-wide text-red-500 font-semibold">
              AU Connect
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
              Connect with fellow AU Students!
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Just a few more details to complete your profile.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* SEGMENTED BUTTONS (NEW) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                You are
              </label>

              <div className="flex bg-zinc-200 rounded-lg p-1 text-sm font-medium">
                {["AU Student", "AU Alumni", "AU Lecturer"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm({ ...form, userType: role })}
                    className={`flex-1 py-2 rounded-md transition
                      ${
                        form.userType === role
                          ? "bg-red-600 text-white shadow"
                          : "text-zinc-700 hover:bg-zinc-300"
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Full name
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 
                focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-400"
              />
            </div>

            {/* Faculty */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Faculty
              </label>

              <select
                name="faculty"
                value={form.faculty}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800
                focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-400 bg-white"
              >
                <option value="" disabled>Select your faculty</option>
                <option>School of Business and Management (BBA)</option>
                <option>School of Arts</option>
                <option>School of Music</option>
                <option>School of Science and Technology</option>
                <option>School of Communication Arts</option>
                <option>School of Architecture and Design</option>
                <option>School of Engineering</option>
                <option>School of Biotechnology</option>
                <option>School of Nursing Science</option>
                <option>School of Law</option>
                <option>School of Medicine – St. Luke</option>
              </select>
            </div>

            {/* Major */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Major
              </label>
              <input
                type="text"
                name="major"
                value={form.major}
                onChange={handleChange}
                placeholder="Enter your major"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800 
                focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-zinc-400"
              />
            </div>

            {/* CONDITIONAL FIELDS */}
            {/* Student */}
            {form.userType === "AU Student" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Intake year
                  </label>
                  <input
                    type="text"
                    name="intakeYear"
                    value={form.intakeYear}
                    onChange={handleYearChange}
                    placeholder="e.g. 2025"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Graduation year (optional)
                  </label>
                  <input
                    type="text"
                    name="graduationYear"
                    value={form.graduationYear}
                    onChange={handleYearChange}
                    placeholder="e.g. 2027"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Alumni */}
            {form.userType === "AU Alumni" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Intake year
                  </label>
                  <input
                    type="text"
                    name="intakeYear"
                    value={form.intakeYear}
                    onChange={handleYearChange}
                    placeholder="e.g. 2018"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Graduation year
                  </label>
                  <input
                    type="text"
                    name="graduationYear"
                    value={form.graduationYear}
                    onChange={handleYearChange}
                    placeholder="e.g. 2022"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Lecturer */}
            {form.userType === "AU Lecturer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Working from (year)
                  </label>
                  <input
                    type="text"
                    name="workFrom"
                    value={form.workFrom}
                    onChange={handleYearChange}
                    placeholder="e.g. 2015"
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Working till
                  </label>
                  <input
                    type="text"
                    name="workTo"
                    value={form.workTo}
                    onChange={handleChange}
                    placeholder="e.g. 2024 or Present"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-red-600 text-white py-2.5 text-sm font-medium 
              hover:bg-red-700 transition"
            >
              Create profile
            </button>

          </form>

          <p className="text-xs text-zinc-400 text-center pt-2">
            Your name and study details help other AU students find you.
          </p>

        </div>
      </div>
    </div>
  );
}
