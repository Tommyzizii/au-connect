import EventCard from "./EventCard";
import { RightEventsProfileTypes } from "@/types/FeedPagePropTypes";

export default function RightEvents( { events, loading }: RightEventsProfileTypes ) {

    return (
        <div className="col-span-3 space-y-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          {loading ? (
            <>
              <EventCard isLoading={true} />
              <EventCard isLoading={true} />
            </>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} isLoading={false} />
            ))
          )}
        </div>
    )
}