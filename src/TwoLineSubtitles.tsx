import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

function resolveVideoSrc(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("file://")) return src;
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

// ─── Layout variants ──────────────────────────────────────────────────────────
type ChunkStyle = "huge" | "large" | "normal" | "compact";

interface Chunk {
  start: number;
  end: number;
  topWords: Word[];
  bottomWords: Word[];
  style: ChunkStyle;
  fontSize: number;
  centered: boolean;
}

// Bold Russian Helvetica: conservative estimate ~0.64 per char to prevent overflow
const CHAR_RATIO = 0.64;
const CANVAS_W = 1080;
const MARGIN = 90;
const MAX_W = CANVAS_W - MARGIN * 2 - 30; // 870px usable (safety margin)

function estimatePx(words: Word[], fs: number): number {
  const chars = words.map((w) => w.word).join(" ").length;
  return chars * fs * CHAR_RATIO;
}

function fitFontSize(words: Word[], maxPx: number, maxFs: number, minFs = 48): number {
  const chars = words.map((w) => w.word).join(" ").length;
  if (chars === 0) return maxFs;
  const fit = Math.floor(maxPx / (chars * CHAR_RATIO));
  return Math.min(maxFs, Math.max(minFs, fit));
}

function classifyStyle(bottomWords: Word[], fontSize: number): ChunkStyle {
  const n = bottomWords.length;
  if (n === 1 && fontSize >= 110) return "huge";
  if (n <= 2 && fontSize >= 88) return "large";
  if (fontSize >= 72) return "normal";
  return "compact";
}

// Build display chunks from segments.
// Rules:
//  • Bottom line: max 3 words AND estimated width ≤ MAX_W at min acceptable font (60px)
//  • Top line: first 2 words of current segment if bottom has ≥ 3 words
//  • If segment is just 1-2 words → all on bottom, no top
function buildChunks(segments: Segment[]): Chunk[] {
  const chunks: Chunk[] = [];
  const MAX_BOTTOM_WORDS = 3;
  const MIN_FS = 52;
  const MAX_FS = 130;

  for (const seg of segments) {
    const words = seg.words;
    if (words.length === 0) continue;

    // Try to split into sub-chunks of up to MAX_BOTTOM_WORDS
    let i = 0;
    let firstInSeg = true;

    while (i < words.length) {
      // Determine top words (only from the very first chunk of a segment)
      let topCount = 0;
      if (firstInSeg && words.length > MAX_BOTTOM_WORDS) {
        topCount = Math.min(2, words.length - 1);
      }

      // Gather bottom words (up to MAX_BOTTOM_WORDS from position i+topCount)
      const startBottom = firstInSeg ? topCount : i;
      const endBottom = Math.min(
        startBottom + MAX_BOTTOM_WORDS,
        words.length
      );
      const bottomWords = words.slice(startBottom, endBottom);
      const topWords = firstInSeg ? words.slice(0, topCount) : [];

      // Compute font size that fits bottom line in MAX_W
      const fs = fitFontSize(bottomWords, MAX_W, MAX_FS, MIN_FS);
      const style = classifyStyle(bottomWords, fs);

      // Centered only for single short words
      const centered =
        bottomWords.length === 1 && bottomWords[0].word.length <= 12;

      chunks.push({
        start: (topWords[0] ?? bottomWords[0]).start,
        end: bottomWords[bottomWords.length - 1].end,
        topWords,
        bottomWords,
        style,
        fontSize: fs,
        centered,
      });

      // Advance to absolute end position of this chunk
      i = endBottom;
      if (i >= words.length) break;
      firstInSeg = false;

      // For subsequent sub-chunks in same segment: no top words
    }
  }

  return chunks;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TwoLineSubtitlesProps {
  videoSrc: string;
  startSec: number;
  endSec: number;
  segments: Segment[];
  accentColor?: string;   // default yellow
  subtitleY?: number;     // center Y of subtitle block, default 1050
}

// ─── Component ────────────────────────────────────────────────────────────────
const SMALL_FONT_RATIO = 0.62;

export const TwoLineSubtitles: React.FC<TwoLineSubtitlesProps> = ({
  videoSrc,
  startSec,
  endSec,
  segments,
  accentColor = "#FFD600",
  subtitleY = 1300,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = startSec + frame / fps;

  const chunks = useMemo(() => buildChunks(segments), [segments]);

  // Active chunk index = last chunk whose start ≤ currentTime
  const activeIdx = useMemo(() => {
    let last = -1;
    for (let i = 0; i < chunks.length; i++) {
      if (currentTime >= chunks[i].start) last = i;
      else break;
    }
    return last;
  }, [chunks, currentTime]);

  const renderVideo = () => (
    <AbsoluteFill>
      {/* Hopecore: warm golden, lifted shadows, soft contrast */}
      <OffthreadVideo
        src={resolveVideoSrc(videoSrc)}
        startFrom={Math.round(startSec * fps)}
        endAt={Math.round(endSec * fps)}
        style={{
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          filter: "brightness(1.12) contrast(0.82) saturate(1.28) sepia(0.18)",
        }}
      />
      {/* Warm amber overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(255,175,60,0.10)",
        pointerEvents: "none",
      }} />
      {/* Dreamy top bloom — divine light from above */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 120% 55% at 50% -5%, rgba(255,245,180,0.22) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      {/* Warm vignette — dark warm edges */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 50% 42%, transparent 28%, rgba(30,12,0,0.68) 100%)",
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );

  if (activeIdx < 0) {
    return <AbsoluteFill style={{ backgroundColor: "#000" }}>{renderVideo()}</AbsoluteFill>;
  }

  const curr = chunks[activeIdx];
  const smallFontCurr = Math.round(curr.fontSize * SMALL_FONT_RATIO);

  const isWordVisible = (w: Word) => currentTime >= w.start;

  // Stroke color for text outlines
  const strokeWhite = "2px rgba(0,0,0,0.85)";
  const strokeYellow = "2px rgba(0,0,0,0.7)";

  const renderLine = (
    words: Word[],
    fontSize: number,
    color: string,
    weight: number,
    centerOverride = false
  ) => {
    if (words.length === 0) return null;
    const stroke = color === "#FFFFFF" ? strokeWhite : strokeYellow;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: centerOverride ? "center" : "flex-start",
          alignItems: "baseline",
          gap: Math.round(fontSize * 0.22),
        }}
      >
        {words.map((w, i) => (
          <span
            key={`${w.start}-${i}`}
            style={{
              fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
              fontWeight: weight,
              fontSize,
              lineHeight: 1.25,
              color,
              opacity: isWordVisible(w) ? 1 : 0,
              WebkitTextStroke: stroke,
              // paintOrder: stroke fill — stroke behind fill for clean look
              // @ts-ignore
              paintOrder: "stroke fill",
            }}
          >
            {w.word}
          </span>
        ))}
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {renderVideo()}

      {/* Current chunk — instant cut, no animation */}
      <div style={{ position: "absolute", left: MARGIN, right: MARGIN, top: subtitleY, zIndex: 16 }}>
        {curr.topWords.length > 0 && renderLine(curr.topWords, smallFontCurr, "#FFFFFF", 400, curr.centered)}
        {renderLine(curr.bottomWords, curr.fontSize, accentColor, 900, curr.centered)}
      </div>
    </AbsoluteFill>
  );
};
