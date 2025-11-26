"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

import {
  GOOGLE_AUTH_DIRECT_PATH,
  LINKEDIN_AUTH_DIRECT_PATH,
  LOGIN_PATH,
  MAIN_PAGE_PATH,
  SIGNUP_PAGE_PATH,
} from "@/lib/constants";
import Provider from "@/enums/Provider";

/*
 * TODO:
 * - add button for linkedin sign in
 * - add loading effects and error messages (use the states defined)
 */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // use this for error messages
  const [errorMsg, setErrorMsg] = useState("");

  // use this for loading state
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!email) {
      setErrorMsg("Please enter your email.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // check if there's a redirect destination
        const searchParams = new URLSearchParams(window.location.search);
        const from = searchParams.get("from") || MAIN_PAGE_PATH;
        router.push(from); // go back to where they came from!
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Left side - Hero section with image */}
      <div className="relative w-1/2 hidden lg:flex items-end overflow-hidden">
        {/* Background Image */}
        <Image
          src="/au-bg.png"
          alt="AU background"
          fill
          className="object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20"></div>

        {/* Text Content at Bottom */}
        <div className="relative z-10 text-white p-12 pb-16 w-full">
          <div className="flex items-center gap-2 mb-4">
            {/* <Sparkles className="w-6 h-6" /> */}
            <span className="text-sm font-semibold tracking-wider uppercase opacity-90">
              AU Connect
            </span>
          </div>

          <h1 className="text-5xl font-bold mb-4 leading-tight">
            Welcome Back
          </h1>

          <p className="text-lg text-gray-200 leading-relaxed mb-6 max-w-md">
            Connect, collaborate, and grow with your fellow AU students. Your
            community awaits.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Log In</h2>
            <p className="text-gray-600">Choose your preferred log-in method</p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              {errorMsg}
            </div>
          )}

          {/* Social login buttons */}
          <div className="space-y-3 mb-8">
            {/* Google */}
            <button
              onClick={() => handleSignin(Provider.GOOGLE)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image src="/google-icon.png" width={20} height={20} alt="Google" />
              <span>Continue with Google</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleSignin(Provider.LINKEDIN)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-[#0A66C2] text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-[#004182] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image src="/linkedin-icon.png" width={20} height={20} alt="LinkedIn" />
              <span>Continue with LinkedIn</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Microsoft */}
            <button
              onClick={() => handleSignin(Provider.MICROSOFT)}
              disabled={loading}
              className="group relative flex items-center justify-center gap-3 w-full py-3.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:from-gray-900 hover:to-black hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image src="/microsoft-icon.png" width={20} height={20} alt="Microsoft" />
              <span>Continue with Microsoft</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-gray-500">
                New to AU Connect?
              </span>
            </div>
          </div>

          {/* Sign up link */}
          <Link
            href={SIGNUP_PAGE_PATH}
            className="flex items-center justify-center w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 group"
          >
            Create an account
            <ArrowRight className="inline-block ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-8">
            © 2025 AU Connect Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}