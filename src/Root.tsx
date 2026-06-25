import { Composition, registerRoot } from "remotion";
import { MontageVideo } from "./MontageVideo";
import { TwoLineSubtitles } from "./TwoLineSubtitles";
import { PillSubtitles } from "./PillSubtitles";
import React from "react";

const W = 1080, H = 1920, FPS = 30;

export const Root: React.FC = () => (
  <>
    {/* Full montage: speaker + B-roll + music + subtitles */}
    <Composition
      id="MontageVideo"
      component={MontageVideo}
      durationInFrames={300 * FPS}
      fps={FPS} width={W} height={H}
      defaultProps={{
        mainVideo: "speaker.mp4",
        voiceAudio: "speaker.mp4",
        musicAudio: "music.mp3",
        musicVolume: 0.18,
        musicStartSec: 0,
        scenes: [],
        segments: [],
        styleName: "hopecore",
        subtitleY: 1300,
      }}
    />

    {/* Subtitles only on a single video */}
    <Composition
      id="TwoLineSubtitles"
      component={TwoLineSubtitles}
      durationInFrames={300 * FPS}
      fps={FPS} width={W} height={H}
      defaultProps={{
        videoSrc: "speaker.mp4",
        startSec: 0, endSec: 60,
        segments: [],
        accentColor: "#FFD600",
        subtitleY: 1300,
      }}
    />

    {/* Pill-highlight subtitle style */}
    <Composition
      id="PillSubtitles"
      component={PillSubtitles}
      durationInFrames={300 * FPS}
      fps={FPS} width={W} height={H}
      defaultProps={{
        videoSrc: "speaker.mp4",
        startSec: 0, endSec: 60,
        segments: [],
      }}
    />
  </>
);

registerRoot(Root);
