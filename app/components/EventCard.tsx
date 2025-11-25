import { MapPin, Clock } from "lucide-react"; 

type EventType = {
  title: string;
  location: string;
  date: string;
};

export default function EventCard({ event, isLoading }: { event: EventType; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="h-32 bg-gray-100"></div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <MapPin className="w-4 h-4" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{event.date}</span>
        </div>
        <button className="text-red-600 text-sm mt-2 hover:underline">Read More</button>
      </div>
    </div>
  );
};