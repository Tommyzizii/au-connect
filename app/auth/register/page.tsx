"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Provider from "@/enums/Provider";
import {
  GOOGLE_AUTH_DIRECT_PATH,
  LINKEDIN_AUTH_DIRECT_PATH,
  MICROSOFT_AUTH_DIRECT_PATH,
} from "@/lib/constants";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function handleSignin(provider: Provider) {
    try {
      switch (provider) {
        case Provider.GOOGLE:
          setLoading(true);
          router.push(GOOGLE_AUTH_DIRECT_PATH);
          break;
        case Provider.LINKEDIN:
          setLoading(true);
          router.push(LINKEDIN_AUTH_DIRECT_PATH);
          break;
        case Provider.MICROSOFT:
          setLoading(true);
          router.push(MICROSOFT_AUTH_DIRECT_PATH);
          break;
      }
    } catch (error) {
      setLoading(false);
      setErrorMsg(error instanceof Error ? error.message : "An error occured with signup. please try again.");
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Left side - Hero section with image */}
      <div className="relative w-full lg:w-1/2 h-64 sm:h-80 lg:h-full flex items-end overflow-hidden">
        {/* Background Image */}
        <Image
          src="/signUp.png"
          alt="AU signup background"
          fill
          className="object-cover object-center lg:object-left"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/45 to-black/10" />

        {/* Text Content */}
        <div className="relative z-10 text-white w-full p-6 sm:p-8 lg:p-12 pb-8 lg:pb-16">
          <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase opacity-90">
            AU Connect
          </span>

          <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            Join Our Community
          </h1>

          <p className="hidden sm:block mt-3 text-sm sm:text-base lg:text-lg text-gray-200 leading-relaxed max-w-md">
            Connect with fellow AU students, collaborate on projects, and grow
            together. Your journey starts here.
          </p>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo section */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg overflow-hidden">
              <Image
                src="/au-connect-logo.png"
                alt="AU Connect logo"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign Up</h2>
            <p className="text-gray-600">
              Choose your preferred sign-up method
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              {errorMsg}
            </div>
          )}

          {/* Social signup buttons */}
          <div className="space-y-3 mb-8">
            {/* Google */}
            <button
              onClick={() => handleSignin(Provider.GOOGLE)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/google-icon.png"
                width={20}
                height={20}
                alt="Google"
              />
              <span>Continue with Google</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleSignin(Provider.LINKEDIN)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-[#0A66C2] text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-[#004182] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/linkedin-icon.png"
                width={20}
                height={20}
                alt="LinkedIn"
              />
              <span>Continue with LinkedIn</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>

            {/* Microsoft */}
            <button
              onClick={() => handleSignin(Provider.MICROSOFT)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-linear-to-r from-gray-800 to-gray-900 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:from-gray-900 hover:to-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/microsoft-icon.png"
                width={20}
                height={20}
                alt="Microsoft"
              />
              <span>Continue with Microsoft</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-8">
            © 2025 AU Connect Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
