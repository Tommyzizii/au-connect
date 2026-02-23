// app/(main)/profile/[slug]/loading.tsx
export default function Loading() {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-12 gap-6">
              {/* LEFT */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                {/* Header card skeleton */}
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="w-full aspect-[3/1] bg-gray-200 animate-pulse" />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="-mt-16 w-32 h-32 rounded-full bg-gray-200 border-4 border-white animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="h-7 w-56 bg-gray-200 rounded animate-pulse" />
                      <div className="h-5 w-72 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Section skeletons */}
                <SectionSkeleton title />
                <SectionSkeleton title />
                <SectionSkeleton title lines={4} />

                {/* Activity skeleton */}
                <div className="bg-white rounded-lg border p-4">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="mt-4 flex gap-3 border-b pb-2">
                    <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>

                  <div className="mt-4 space-y-4">
                    <PostCardSkeleton />
                    <PostCardSkeleton />
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="hidden lg:block col-span-4 space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="h-5 w-56 bg-gray-200 rounded animate-pulse" />
                  <div className="mt-4 space-y-3">
                    <RowSkeleton />
                    <RowSkeleton />
                    <RowSkeleton />
                    <RowSkeleton />
                  </div>
                  <div className="mt-4 h-5 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}

function SectionSkeleton({ title, lines = 3 }: { title?: boolean; lines?: number }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        {title ? <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" /> : null}
        <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-11/12 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-9/12 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="mt-4 h-8 w-full bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}