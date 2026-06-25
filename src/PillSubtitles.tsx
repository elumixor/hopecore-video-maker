import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function resolveVideoSrc(src: string): string {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("file://")
  ) {
    return src;
  }
  return staticFile(src);
}

interface Word {
  word: string;
  start: number;
  end: number;
}

interface Segment {
  start: number;
  end: number;
  words: Word[];
}

export interface PillSubtitlesProps {
  videoSrc: string;
  startSec: number;
  endSec: number;
  segments: Segment[];
  pillColor?: string;
  subtitleBottom?: number;
}

export const PillSubtitles: React.FC<PillSubtitlesProps> = ({
  videoSrc,
  startSec,
  endSec,
  segments,
  pillColor = "#F5A623",
  subtitleBottom = 200,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTime = startSec + frame / fps;

  // Active segment — extends slightly past end to avoid flicker
  const activeSegment = useMemo(() => {
    return segments.find(
      (s) => currentTime >= s.start && currentTime <= s.end + 0.08
    ) ?? null;
  }, [segments, currentTime]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill>
        <OffthreadVideo
          src={resolveVideoSrc(videoSrc)}
          startFrom={Math.round(startSec * fps)}
          endAt={Math.round(endSec * fps)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center center",
          }}
        />
      </AbsoluteFill>

      {activeSegment && (
        <div
          style={{
            position: "absolute",
            bottom: subtitleBottom,
            left: 50,
            right: 50,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 6,
            rowGap: 12,
            zIndex: 15,
          }}
        >
          {activeSegment.words.map((w, i) => {
            const isActive =
              currentTime >= w.start && currentTime < w.end + 0.05;
            return (
              <span
                key={`${w.start}-${i}`}
                style={{
                  fontFamily:
                    "Helvetica Neue, Helvetica, Arial, sans-serif",
                  fontWeight: 800,
                  fontSize: 58,
                  lineHeight: 1.3,
                  color: "#FFFFFF",
                  backgroundColor: isActive ? pillColor : "transparent",
                  paddingTop: 6,
                  paddingBottom: 6,
                  paddingLeft: 18,
                  paddingRight: 18,
                  borderRadius: 14,
                  textShadow: isActive
                    ? "none"
                    : "0 2px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,1)",
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
