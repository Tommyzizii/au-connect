"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

type SystemStateProps = {
  code: string;
  title: string;
  description: string;
  onRetry?: () => void;
  showBack?: boolean;
  hideChrome?: boolean;
};

export default function SystemState({
  code,
  title,
  description,
  onRetry,
  showBack = false,
  hideChrome = false,
}: SystemStateProps) {
  const isNotFound = code === "404";

  return (
    <section
      data-page-kind={hideChrome ? "not-found" : "error"}
      className="relative isolate flex min-h-full w-full flex-col overflow-hidden bg-[#f7e7e9] text-[#171315]"
    >
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7 lg:px-12 lg:pt-9">
        <Link
          href="/"
          aria-label="AU Connect home"
          className="relative z-10 text-[0.68rem] font-black uppercase leading-[0.82] tracking-[-0.04em] sm:text-sm"
        >
          <span className="block text-xl tracking-[-0.09em] sm:text-2xl">AU</span>
          Connect
        </Link>
        <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-black/45 sm:block">
          Assumption University
        </p>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-8 pt-4 text-center sm:px-8 sm:pb-12 lg:pb-14">
        {isNotFound ? (
          <div
            className="relative mb-5 h-[clamp(9rem,30vw,22rem)] w-[min(88vw,48rem)] sm:mb-7"
            aria-hidden="true"
          >
            <div className="absolute left-[5%] top-[4%] aspect-square w-[48%] rounded-[50%_48%_52%_46%] bg-white" />
            <div className="absolute right-[3%] top-[16%] aspect-square w-[47%] rounded-[46%_52%_48%_50%] bg-white" />
            <div className="absolute left-[29%] top-[13%] aspect-square w-[15%] rounded-full bg-[#171315] sm:left-[31%]" />
            <div className="absolute right-[27%] top-[27%] aspect-square w-[15%] rounded-full bg-[#171315] sm:right-[29%]" />
          </div>
        ) : (
          <div
            className="relative mb-6 flex h-[clamp(9rem,25vw,18rem)] w-[clamp(9rem,25vw,18rem)] rotate-3 items-center justify-center rounded-[46%_54%_47%_53%] bg-white text-[clamp(5rem,14vw,10rem)] font-black leading-none sm:mb-8"
            aria-hidden="true"
          >
            <span className="-translate-y-[3%] -rotate-3">!</span>
            <span className="absolute -right-[9%] top-[4%] h-[22%] w-[22%] rounded-full bg-red-700" />
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-800 sm:text-sm">
          {isNotFound
            ? "Looks like you’re off campus"
            : "Connection interrupted"}
        </p>
        <h1 className="mt-2 max-w-5xl font-serif text-[clamp(2.45rem,7vw,6.5rem)] font-normal leading-[0.95] tracking-[-0.055em]">
          {code}, {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/60 sm:mt-5 sm:text-base lg:text-lg">
          {description}
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full bg-[#171315] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          )}
          <Link
            href="/"
            className="inline-flex min-w-44 items-center justify-center rounded-full bg-[#171315] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Take me home
          </Link>
          {showBack && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-black/60 underline decoration-black/25 underline-offset-4 transition hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Previous page
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute -bottom-16 -left-16 -z-10 h-40 w-40 rounded-full border-[2rem] border-red-800/8 sm:h-56 sm:w-56" />
      <div className="pointer-events-none absolute -right-10 top-1/3 -z-10 h-24 w-24 rotate-12 bg-white/35 sm:right-8 sm:h-36 sm:w-36" />
    </section>
  );
}
