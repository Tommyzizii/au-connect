import Link from "next/link";

export default function PostNotFoundPage() {
  return (
    <div className="h-full overflow-hidden">
      <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-6 h-56 w-56 rounded-full bg-amber-100/80 blur-3xl" />

        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200/70 bg-linear-to-br from-white via-neutral-50 to-blue-50/50 p-6 shadow-xl sm:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-blue-400 via-cyan-400 to-blue-500" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700 shadow-inner">
            !
          </div>

          <div className="mt-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Post not available
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
              This post was deleted, so this notification can no longer be
              opened.
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              You can continue from notifications or return home.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link
              href="/notifications"
              className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Back to notifications
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Go home
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
