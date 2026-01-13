// app/connect/page.tsx
import Image from "next/image";

const connectRequests = [
  {
    id: 1,
    name: "Courtney Henry",
    title: "Data-scientist",
    batch: "Class 2015, School of Science & Technology",
    location: "Bangkok, Thailand",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    title: "Software Engineer",
    batch: "Class 2016, School of Engineering",
    location: "Singapore",
  },
  {
    id: 3,
    name: "Michael Chen",
    title: "Product Manager",
    batch: "Class 2014, School of Business and Management",
    location: "Hong Kong",
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    title: "UX Designer",
    batch: "Class 2017, School of DDI",
    location: "Bangkok, Thailand",
  },
  {
    id: 5,
    name: "David Kim",
    title: "Marketing Specialist",
    batch: "Class 2015, School of Communication Art",
    location: "Seoul, South Korea",
  },
  {
    id: 6,
    name: "Jessica Wong",
    title: "Financial Analyst",
    batch: "Class 2016, School of Business and Management",
    location: "Tokyo, Japan",
  },
  {
    id: 7,
    name: "Robert Smith",
    title: "Research Scientist",
    batch: "Class 2013, School of Science & Technology",
    location: "Bangkok, Thailand",
  },
  {
    id: 8,
    name: "Amanda Liu",
    title: "HR Manager",
    batch: "Class 2015, School of Business and Management",
    location: "Kuala Lumpur, Malaysia",
  },
];

export default function ConnectPage() {
  return (
    <main className="h-full overflow-y-auto bg-white">
      {/* Content area */}
      <div className="w-full px-10 py-10">
        
        {/* CONNECT REQUESTS */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            {/* <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div> */}
            <h2 className="text-lg font-bold text-neutral-800 tracking-tight">
              Connect Requests
            </h2>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
              {connectRequests.length} new
            </span>
          </div>

          <div className="space-y-4">
            {connectRequests.map((user) => (
              <div
                key={user.id}
                className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-neutral-50 to-neutral-100/50 p-6 border border-neutral-200/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-linear-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500"></div>
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: avatar + info */}
                  <div className="flex items-start md:items-center gap-4">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-neutral-200 group-hover:ring-blue-400 transition-all duration-300">
                        <Image
                          src="/au-connect-logo.png"
                          alt={user.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-4 border-white"></div>
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="font-bold text-neutral-900 text-base">
                        {user.name}
                      </div>
                      <div className="text-neutral-600 font-medium">{user.title}</div>
                      <div className="text-neutral-500 text-xs leading-relaxed">
                        {user.batch}
                        <br />
                        <span className="inline-flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {user.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: buttons */}
                  <div className="flex items-center gap-3 ml-auto">
                    <button className="rounded-xl bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Accept
                      </span>
                    </button>
                    <button className="rounded-xl bg-neutral-200 hover:bg-neutral-300 px-6 py-2.5 text-sm font-semibold text-neutral-700 transition-all duration-300 hover:scale-105">
                      <span className="flex items-center gap-2">
                        Decline
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
