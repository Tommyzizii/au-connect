"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="flex h-screen">
      {/* Left side - Background image + Welcome text */}
      <div className="relative w-1/2 hidden md:block">
        <Image
          src="/au-bg.png"
          alt="AU background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40"></div>

        <div className="absolute bottom-20 left-10 text-white">
          <h1 className="text-4xl font-semibold">Welcome to</h1>
          <h1 className="text-5xl font-bold mt-1">AU Connect</h1>
        </div>
      </div>

      {/* Right side - Form card */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50">
        <div className="bg-white shadow-xl rounded-2xl p-10 w-[90%] max-w-md">
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/au-connect-logo.png"
              width={60}
              height={60}
              alt="Logo"
            />

            <p className="mt-2 text-xl font-semibold text-center text-gray-900">
              Connect with fellow AU Students!
            </p>
          </div>

          {/* Email */}
          <div className="mt-6">
            <label className="block mb-1 text-sm font-semibold text-gray-900">
              Email
            </label>
            <input
              type="text"
              className="w-full border rounded-md p-2 focus:ring focus:ring-blue-300 text-gray-600"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="mt-4">
            <label className="block mb-1 text-sm font-semibold text-gray-900">
              Password
            </label>
            <input
              type="password"
              className="w-full border rounded-md p-2 focus:ring focus:ring-blue-300 text-gray-600"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Remember me & forgot password */}
          <div className="flex justify-between items-center mt-3 text-sm">
            {/* TODO: remember me logic not yet implemented in backend yet :[ */}
            <label className="flex items-center gap-2 text-gray-500">
              <input type="checkbox" /> Remember me
            </label>
            {/* TODO: needs path name here but has not been implemented yet*/}
            <Link href="#" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>

          {errorMsg && <p className="mt-5 text-red-400">{errorMsg}</p>}

          {/* Sign in button */}
          <button
            className="w-full mt-5 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition"
            onClick={() => handleLogin()}
          >
            {loading ? "Sigining in..." : "Sign up"}
          </button>

          {/* Google login */}
          <button
            className="w-full mt-3 bg-black text-white py-2 rounded-md hover:bg-gray-800 flex items-center justify-center gap-2"
            onClick={() => handleSignin(Provider.GOOGLE)}
          >
            <Image src="/google-icon.png" width={20} height={20} alt="Google" />
            Sign in with Google
          </button>

          {/* Signup link */}
          <div className="mt-6 text-center text-sm text-gray-600">
            Dont have an account?{" "}
            <Link
              href={SIGNUP_PAGE_PATH}
              className="text-blue-600 hover:underline"
            >
              Sign up now
            </Link>
          </div>

          <p className="text-center text-xs mt-6 text-gray-500">
            © AU Connect Team 2025
          </p>
        </div>
      </div>
    </div>
  );
}
