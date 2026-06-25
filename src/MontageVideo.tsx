/**
 * MontageVideo — general-purpose short video montage component.
 *
 * Supports multiple visual styles (hopecore, cinematic, minimal, retro, dark).
 * Combines speaker video, B-roll clips, voice audio, background music,
 * and kinetic two-line subtitles.
 */

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
import { STYLES, DEFAULT_STYLE, type VideoStyle } from "./styles";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Word { word: string; start: number; end: number }
interface Segment { start: number; end: number; words: Word[] }

interface Scene {
  type: "speaker" | "broll";
  clip: string;
  start: number;
  end: number;
}

export interface MontageVideoProps {
  mainVideo: string;
  voiceAudio: string;
  musicAudio: string;
  musicVolume: number;
  musicStartSec: number;
  scenes: Scene[];
  segments: Segment[];
  accentColor?: string;       // override style accent color
  subtitleY: number;
  styleName: string;          // key from STYLES object
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MARGIN = 90;
const MAX_W = 870;
const CHAR_RATIO = 0.64;
const SMALL_FONT_RATIO = 0.62;
const MAX_FONT = 130;
const MIN_FONT = 52;
const MAX_BOTTOM_WORDS = 3;

// ─── Subtitle helpers ─────────────────────────────────────────────────────────
interface Chunk {
  start: number; end: number;
  topWords: Word[]; bottomWords: Word[];
  fontSize: number; centered: boolean;
}

function fitFontSize(words: Word[]): number {
  const chars = words.map(w => w.word).join(" ").length;
  if (!chars) return MAX_FONT;
  return Math.min(MAX_FONT, Math.max(MIN_FONT, Math.floor(MAX_W / (chars * CHAR_RATIO))));
}

function buildChunks(segments: Segment[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const seg of segments) {
    const words = seg.words;
    if (!words.length) continue;
    let i = 0, firstInSeg = true;
    while (i < words.length) {
      let topCount = 0;
      if (firstInSeg && words.length > MAX_BOTTOM_WORDS)
        topCount = Math.min(2, words.length - 1);
      const startBot = firstInSeg ? topCount : i;
      const endBot = Math.min(startBot + MAX_BOTTOM_WORDS, words.length);
      const bottomWords = words.slice(startBot, endBot);
      const topWords = firstInSeg ? words.slice(0, topCount) : [];
      chunks.push({
        start: (topWords[0] ?? bottomWords[0]).start,
        end: bottomWords[bottomWords.length - 1].end,
        topWords, bottomWords,
        fontSize: fitFontSize(bottomWords),
        centered: bottomWords.length === 1 && bottomWords[0].word.length <= 12,
      });
      i = endBot;
      if (i >= words.length) break;
      firstInSeg = false;
    }
  }
  return chunks;
}

// ─── Overlays ─────────────────────────────────────────────────────────────────
const StyleOverlays: React.FC<{ style: VideoStyle }> = ({ style }) => (
  <>
    {style.warmOverlay !== "rgba(0,0,0,0)" && (
      <div style={{ position: "absolute", inset: 0, background: style.warmOverlay, pointerEvents: "none" }} />
    )}
    {style.bloomGradient !== "rgba(0,0,0,0)" && (
      <div style={{ position: "absolute", inset: 0, background: style.bloomGradient, pointerEvents: "none" }} />
    )}
    <div style={{ position: "absolute", inset: 0, background: style.vignetteGradient, pointerEvents: "none" }} />
  </>
);

// ─── Speaker scene ────────────────────────────────────────────────────────────
const SpeakerScene: React.FC<{ src: string; sceneStartFrame: number; style: VideoStyle; isFirst: boolean }> = ({
  src, sceneStartFrame, style, isFirst,
}) => {
  const frame = useCurrentFrame();
  const introOpacity = isFirst
    ? interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
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
          filter: style.videoFilter,
          opacity: introOpacity,
        }}
      />
      <StyleOverlays style={style} />
    </AbsoluteFill>
  );
};

// ─── B-roll scene ─────────────────────────────────────────────────────────────
const BrollScene: React.FC<{ src: string; style: VideoStyle }> = ({ src, style }) => (
  <AbsoluteFill>
    <OffthreadVideo
      src={staticFile(src)}
      muted
      style={{
        width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        filter: style.videoFilter,
      }}
    />
    <StyleOverlays style={style} />
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
      <div style={{
        display: "flex", flexWrap: "nowrap",
        justifyContent: center ? "center" : "flex-start",
        alignItems: "baseline",
        gap: Math.round(fontSize * 0.22),
      }}>
        {words.map((w, i) => (
          <span key={`${w.start}-${i}`} style={{
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontWeight: weight, fontSize, lineHeight: 1.25,
            color, opacity: isVisible(w) ? 1 : 0,
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
export const MontageVideo: React.FC<MontageVideoProps> = ({
  mainVideo, voiceAudio, musicAudio, musicVolume, musicStartSec,
  scenes, segments, accentColor, subtitleY, styleName,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const style = STYLES[styleName] ?? STYLES[DEFAULT_STYLE];
  const resolvedAccent = accentColor ?? style.accentColor;
  const chunks = useMemo(() => buildChunks(segments), [segments]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile(voiceAudio)} volume={1} />
      <Audio src={staticFile(musicAudio)} volume={musicVolume} startFrom={Math.round(musicStartSec * fps)} />

      <AbsoluteFill>
        {scenes.map((scene, i) => {
          const startF = Math.round(scene.start * fps);
          const endF = Math.round(scene.end * fps);
          const durF = endF - startF;
          if (frame < startF || frame >= endF) return null;

          if (scene.type === "speaker") {
            return (
              <Sequence key={i} from={startF} durationInFrames={durF} layout="none">
                <SpeakerScene src={mainVideo} sceneStartFrame={startF} style={style} isFirst={i === 0} />
              </Sequence>
            );
          }
          return (
            <Sequence key={i} from={startF} durationInFrames={durF} layout="none">
              <BrollScene src={scene.clip} style={style} />
            </Sequence>
          );
        })}
      </AbsoluteFill>

      <Subtitles chunks={chunks} currentTime={currentTime} accentColor={resolvedAccent} subtitleY={subtitleY} />
    </AbsoluteFill>
  );
};
