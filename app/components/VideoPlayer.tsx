"use client";

import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerProps,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { useState } from "react";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

type VideoPlayerProps = {
  src: string;
  showControls?: boolean;
  useDefaultLayout?: boolean;
  poster?: string;
  loadOnPlay?: boolean;
} & Omit<MediaPlayerProps, "src" | "children">;

export default function VideoPlayer({
  src,
  showControls = false,
  useDefaultLayout = false,
  poster,
  loadOnPlay = false,
  ...playerProps
}: VideoPlayerProps) {
  const [shouldLoad, setShouldLoad] = useState(!loadOnPlay);

  if (!shouldLoad) {
    return (
      <button
        type="button"
        aria-label="Play video"
        className={`group relative block h-full w-full overflow-hidden bg-black ${playerProps.className ?? ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setShouldLoad(true);
        }}
      >
        {poster && (
          // A not-yet-generated asynchronous thumbnail may 404; black remains
          // as a safe fallback and the video is still playable.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="h-full w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-3xl text-white transition-transform group-hover:scale-105">
          ▶
        </span>
      </button>
    );
  }

  return (
    <MediaPlayer
      src={src}
      poster={poster}
      {...playerProps}
      autoPlay={loadOnPlay || playerProps.autoPlay}
      controls={showControls}
      className={`w-full h-full ${playerProps.className ?? ""}`}
    >
      <MediaProvider />

      {showControls && useDefaultLayout && (
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      )}
    </MediaPlayer>
  );
}
