"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import Provider from "@/enums/Provider";
import {
  GOOGLE_AUTH_DIRECT_PATH,
  LINKEDIN_AUTH_DIRECT_PATH,
  LOGIN_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  SIGNUP_PATH,
} from "@/lib/constants";

/*
 * TODO:
 * - add button for linkedin sign in
 * - add loading effects and error messages (use the states defined)
 */

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function handleSignin(provider: Provider) {
    switch (provider) {
      case Provider.GOOGLE:
        router.push(GOOGLE_AUTH_DIRECT_PATH);
        break;
      case Provider.LINKEDIN:
        router.push(LINKEDIN_AUTH_DIRECT_PATH);
        break;
    }
  }
  // In your SignUpPage component

  const handleSignup = async () => {
    // Validation
    if (!form.email) {
      setErrorMsg("Please enter your email.");
      return;
    }

    if (!form.password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    if (!form.confirmPassword) {
      setErrorMsg("Please confirm your password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(SIGNUP_PATH, {
        // You'll need to add this to your constants
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      if (res.ok) {
        router.push(ONBOARD_PAGE_PATH);
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("An error occurred during signup. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
          >
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

            {errorMsg && <p className="mt-5 text-red-400">{errorMsg}</p>}

            {/* Create Account */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full mt-5 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Google Sign Up */}
          <button
            onClick={() => handleSignin(Provider.GOOGLE)}
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
            <Link
              href={LOGIN_PAGE_PATH}
              className="text-blue-600 font-medium hover:underline ml-1"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
