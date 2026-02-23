export default function LoadingPostModal() {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-6xl h-[90vh] rounded-lg overflow-hidden"
        style={{ maxWidth: "1100px" }}
      >
        <div className="hidden md:flex w-full h-full min-h-0">
          <div
            style={{
              width: "65%",
              minWidth: 0,
              flexShrink: 0,
              display: "flex",
              minHeight: 0,
              backgroundColor: "#111827",
            }}
            className="animate-pulse p-6 items-center justify-center"
          >
            <div className="w-full space-y-4">
              <div className="h-6 w-2/3 rounded bg-gray-700" />
              <div className="h-4 w-1/2 rounded bg-gray-700" />
              <div className="h-64 w-full rounded bg-gray-800" />
            </div>
          </div>

          <div
            style={{
              width: "35%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              borderLeft: "1px solid #e5e7eb",
            }}
            className="animate-pulse"
          >
            <div className="border-b p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-200" />
              </div>
            </div>
            <div className="p-4 space-y-3 border-b">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
            </div>
            <div className="flex-1 p-4 space-y-4">
              <div className="h-16 rounded bg-gray-200" />
              <div className="h-16 rounded bg-gray-200" />
              <div className="h-16 rounded bg-gray-200" />
            </div>
            <div className="border-t p-3">
              <div className="h-10 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>

        <div className="md:hidden h-full flex flex-col animate-pulse">
          <div className="border-b p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-gray-200" />
              <div className="h-3 w-28 rounded bg-gray-200" />
            </div>
          </div>
          <div className="p-4 space-y-3 border-b">
            <div className="h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            <div className="h-16 rounded bg-gray-200" />
            <div className="h-16 rounded bg-gray-200" />
            <div className="h-16 rounded bg-gray-200" />
          </div>
          <div className="border-t p-3">
            <div className="h-10 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
