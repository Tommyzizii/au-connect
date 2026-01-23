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

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

type VideoPlayerProps = {
  src: string;
  showControls?: boolean;
  useDefaultLayout?: boolean;
} & Omit<MediaPlayerProps, "src" | "children">;

export default function VideoPlayer({
  src,
  showControls = false,
  useDefaultLayout = false,
  ...playerProps
}: VideoPlayerProps) {
  return (
    <MediaPlayer
      src={src}
      {...playerProps}
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
