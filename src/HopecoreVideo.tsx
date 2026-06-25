import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Word { word: string; start: number; end: number }
interface Segment { start: number; end: number; words: Word[] }

type SceneType = "speaker" | "broll";
interface Scene {
  type: SceneType;
  clip: string;   // "broll/burnout.mp4" or "vozmitessoboi_menshe.mp4"
  start: number;  // seconds in composition
  end: number;
  zoomDir?: "in" | "out";
}

export interface HopecoreVideoProps {
  mainVideo: string;
  voiceAudio: string;
  musicAudio: string;
  musicVolume: number;
  scenes: Scene[];
  segments: Segment[];
  accentColor: string;
  subtitleY: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MARGIN = 90;
const MAX_W = 870;
const CHAR_RATIO = 0.64;
const SMALL_FONT_RATIO = 0.62;

// ─── Subtitle helpers ─────────────────────────────────────────────────────────
type ChunkStyle = "huge" | "large" | "normal" | "compact";
interface Chunk {
  start: number; end: number;
  topWords: Word[]; bottomWords: Word[];
  fontSize: number; centered: boolean;
}

function fitFontSize(words: Word[], maxPx: number, maxFs = 130, minFs = 52): number {
  const chars = words.map(w => w.word).join(" ").length;
  if (!chars) return maxFs;
  return Math.min(maxFs, Math.max(minFs, Math.floor(maxPx / (chars * CHAR_RATIO))));
}

function buildChunks(segments: Segment[]): Chunk[] {
  const chunks: Chunk[] = [];
  const MAX_BOT = 3;
  for (const seg of segments) {
    const words = seg.words;
    if (!words.length) continue;
    let i = 0, firstInSeg = true;
    while (i < words.length) {
      let topCount = 0;
      if (firstInSeg && words.length > MAX_BOT) topCount = Math.min(2, words.length - 1);
      const startBot = firstInSeg ? topCount : i;
      const endBot = Math.min(startBot + MAX_BOT, words.length);
      const bottomWords = words.slice(startBot, endBot);
      const topWords = firstInSeg ? words.slice(0, topCount) : [];
      const fs = fitFontSize(bottomWords, MAX_W);
      chunks.push({
        start: (topWords[0] ?? bottomWords[0]).start,
        end: bottomWords[bottomWords.length - 1].end,
        topWords, bottomWords, fontSize: fs,
        centered: bottomWords.length === 1 && bottomWords[0].word.length <= 12,
      });
      i = endBot;
      if (i >= words.length) break;
      firstInSeg = false;
    }
  }
  return chunks;
}

// ─── Hopecore overlays ────────────────────────────────────────────────────────
const HopecoreOverlay: React.FC = () => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "rgba(255,175,60,0.09)", pointerEvents: "none" }} />
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse 130% 55% at 50% -5%, rgba(255,245,185,0.20) 0%, transparent 60%)",
      pointerEvents: "none",
    }} />
    <div style={{
      position: "absolute", inset: 0,
      background: "radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(28,10,0,0.42) 100%)",
      pointerEvents: "none",
    }} />
  </>
);

// ─── Speaker scene ────────────────────────────────────────────────────────────
const SpeakerScene: React.FC<{ src: string; sceneStartFrame: number; introFade: boolean }> = ({
  src, sceneStartFrame, introFade,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Dark intro fade: composition frames 0-20 fade from black
  const globalFrame = frame; // inside Sequence, frame is relative
  const introOpacity = introFade
    ? interpolate(globalFrame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(src)}
        startFrom={sceneStartFrame}
        muted
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          filter: "brightness(1.10) contrast(0.84) saturate(1.25) sepia(0.15)",
          opacity: introOpacity,
        }}
      />
      <HopecoreOverlay />
    </AbsoluteFill>
  );
};

// ─── B-roll scene ─────────────────────────────────────────────────────────────
const BrollScene: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill>
    <OffthreadVideo
      src={staticFile(src)}
      muted
      style={{
        width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        filter: "brightness(1.08) contrast(0.86) saturate(1.30) sepia(0.14)",
      }}
    />
    <HopecoreOverlay />
  </AbsoluteFill>
);

// ─── Subtitles ────────────────────────────────────────────────────────────────
const Subtitles: React.FC<{
  chunks: Chunk[]; currentTime: number; accentColor: string; subtitleY: number;
}> = ({ chunks, currentTime, accentColor, subtitleY }) => {
  const activeIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < chunks.length; i++) {
      if (currentTime >= chunks[i].start) last = i;
      else break;
    }
    return last;
  }, [chunks, currentTime]);

  if (activeIdx < 0) return null;
  const curr = chunks[activeIdx];
  const smallFont = Math.round(curr.fontSize * SMALL_FONT_RATIO);
  const isVisible = (w: Word) => currentTime >= w.start;

  const renderLine = (words: Word[], fontSize: number, color: string, weight: number, center = false) => {
    if (!words.length) return null;
    return (
      <div style={{ display: "flex", flexWrap: "nowrap", justifyContent: center ? "center" : "flex-start", alignItems: "baseline", gap: Math.round(fontSize * 0.22) }}>
        {words.map((w, i) => (
          <span key={`${w.start}-${i}`} style={{
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontWeight: weight, fontSize, lineHeight: 1.25, color,
            opacity: isVisible(w) ? 1 : 0,
            WebkitTextStroke: color === "#FFFFFF" ? "2px rgba(0,0,0,0.85)" : "2px rgba(0,0,0,0.7)",
            // @ts-ignore
            paintOrder: "stroke fill",
          }}>{w.word}</span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: subtitleY, zIndex: 20 }}>
      {curr.topWords.length > 0 && renderLine(curr.topWords, smallFont, "#FFFFFF", 400, curr.centered)}
      {renderLine(curr.bottomWords, curr.fontSize, accentColor, 900, curr.centered)}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const HopecoreVideo: React.FC<HopecoreVideoProps> = ({
  mainVideo, voiceAudio, musicAudio, musicVolume,
  scenes, segments, accentColor, subtitleY,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const chunks = useMemo(() => buildChunks(segments), [segments]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* ── Audio ── */}
      <Audio src={staticFile(voiceAudio)} volume={1} />
      <Audio src={staticFile(musicAudio)} volume={musicVolume} startFrom={Math.round(6 * fps)} />

      {/* ── Scenes (full screen, no frame) ── */}
      <AbsoluteFill>
        {scenes.map((scene, i) => {
          const startF = Math.round(scene.start * fps);
          const endF = Math.round(scene.end * fps);
          const durF = endF - startF;
          if (frame < startF || frame >= endF) return null;

          if (scene.type === "speaker") {
            return (
              <Sequence key={i} from={startF} durationInFrames={durF} layout="none">
                <SpeakerScene src={mainVideo} sceneStartFrame={startF} introFade={i === 0} />
              </Sequence>
            );
          } else {
            return (
              <Sequence key={i} from={startF} durationInFrames={durF} layout="none">
                <BrollScene src={scene.clip} />
              </Sequence>
            );
          }
        })}
      </AbsoluteFill>

      {/* ── Subtitles ── */}
      <Subtitles chunks={chunks} currentTime={currentTime} accentColor={accentColor} subtitleY={subtitleY} />

    </AbsoluteFill>
  );
};
