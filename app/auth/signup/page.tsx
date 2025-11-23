"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignUpPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Signup:", form);
    alert("Account created!");
  };

  return (
    <div className="relative min-h-screen flex">

      {/* MOBILE BACKGROUND IMAGE (same as onboarding) */}
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
            Join <span className="block mt-2">AU Connect</span>
          </h1>
        </div>
      </div>

      {/* RIGHT SIDE (Mobile Centered Card like onboarding) */}
      <div
        className="
          relative z-10
          flex items-center justify-center
          w-full md:flex-1
          px-4 py-10 md:p-0
          bg-white/0 md:bg-zinc-50
          backdrop-blur-sm md:backdrop-blur-none
        "
      >
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
          <div className="text-center md:text-left">
            <p className="text-xs uppercase tracking-wide text-red-500 font-semibold">
              AU Connect
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">
              Create your account
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Sign up with your Gmail or password.
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="
                  w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800
                  focus:outline-none focus:ring-2 focus:ring-red-500
                  placeholder:text-zinc-400
                "
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create password"
                required
                className="
                  w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800
                  focus:outline-none focus:ring-2 focus:ring-red-500
                  placeholder:text-zinc-400
                "
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                className="
                  w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-800
                  focus:outline-none focus:ring-2 focus:ring-red-500
                  placeholder:text-zinc-400
                "
              />
            </div>

            {/* Create Account */}
            <button
              type="submit"
              className="
                w-full mt-5 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition
              "
            >
              Create Account
            </button>
          </form>

          {/* Google Sign Up */}
          <button
            onClick={() => signIn("google")}
            className="
              w-full mt-3 bg-black text-white py-2 rounded-md flex items-center justify-center gap-2
              hover:bg-gray-800 transition
            "
          >
            <Image src="/google-icon.png" width={20} height={20} alt="Google" />
            Sign up with Google
          </button>

          {/* Login Link */}
          <p className="text-xs text-zinc-400 text-center pt-2">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-red-600 font-medium hover:underline ml-1"
            >
              Sign in
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
