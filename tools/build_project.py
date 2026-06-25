#!/usr/bin/env python3
"""
Build the Remotion render props JSON from a transcript and scene schedule.

Usage:
  python3 tools/build_project.py \\
    --transcript transcript/video.json \\
    --scenes scenes.json \\
    --style hopecore \\
    --music-start 6.0 \\
    --output props.json

Then render:
  npx remotion render --config remotion.config.ts MontageVideo output/result.mp4 \\
    --props props.json --frames 0-<total_frames>
"""

import argparse
import json
import os
import sys


AVAILABLE_STYLES = ["hopecore", "cinematic", "minimal", "retro", "dark"]


def load_segments(transcript_path: str) -> list:
    with open(transcript_path, encoding="utf-8") as f:
        data = json.load(f)
    segments = []
    for seg in data["segments"]:
        words = [
            {
                "word": w["word"].strip(),
                "start": round(w["start"], 3),
                "end": round(w["end"], 3),
            }
            for w in seg.get("words", [])
        ]
        segments.append({
            "start": round(seg["start"], 3),
            "end": round(seg["end"], 3),
            "words": words,
        })
    return segments


def validate_media(path: str, label: str):
    full = os.path.join("public", path)
    if not os.path.exists(full):
        print(f"WARNING: {label} not found at public/{path}")
        print(f"         Copy it there before rendering.")


def main():
    parser = argparse.ArgumentParser(description="Build Remotion render props")
    parser.add_argument("--transcript", required=True, help="Path to transcript JSON (from transcribe.py)")
    parser.add_argument("--scenes", default=None, help="Path to scenes.json (optional)")
    parser.add_argument("--main-video", default="speaker.mp4", help="Speaker video filename in public/")
    parser.add_argument("--music", default="music.mp3", help="Music filename in public/")
    parser.add_argument("--music-start", type=float, default=0.0, help="Skip N seconds at start of music")
    parser.add_argument("--music-volume", type=float, default=0.18, help="Music volume 0.0–1.0")
    parser.add_argument("--style", default="hopecore", choices=AVAILABLE_STYLES, help="Visual style preset")
    parser.add_argument("--accent-color", default=None, help="Override accent color (hex, e.g. #FFD600)")
    parser.add_argument("--subtitle-y", type=int, default=1300, help="Subtitle vertical position (0=top, 1920=bottom)")
    parser.add_argument("--output", default="props.json", help="Output props JSON path")
    args = parser.parse_args()

    if not os.path.exists(args.transcript):
        print(f"ERROR: transcript not found: {args.transcript}")
        sys.exit(1)

    segments = load_segments(args.transcript)
    if not segments:
        print("ERROR: no segments found in transcript")
        sys.exit(1)

    duration = segments[-1]["end"]

    # Validate media files
    validate_media(args.main_video, "main video")
    validate_media(args.music, "music")

    # Load or generate scenes
    if args.scenes:
        if not os.path.exists(args.scenes):
            print(f"ERROR: scenes file not found: {args.scenes}")
            sys.exit(1)
        with open(args.scenes) as f:
            scenes = json.load(f)
        # Validate B-roll clips exist
        for scene in scenes:
            if scene["type"] == "broll":
                validate_media(scene["clip"], f"B-roll clip '{scene['clip']}'")
    else:
        # Default: speaker video only, full duration
        print("No scenes.json provided — rendering speaker video only (no B-roll).")
        scenes = [{"type": "speaker", "clip": args.main_video, "start": 0.0, "end": duration}]

    total_frames = int(duration * 30) + 5

    props = {
        "mainVideo": args.main_video,
        "voiceAudio": args.main_video,   # use video's own audio by default
        "musicAudio": args.music,
        "musicVolume": args.music_volume,
        "musicStartSec": args.music_start,
        "scenes": scenes,
        "segments": segments,
        "styleName": args.style,
        "subtitleY": args.subtitle_y,
    }

    if args.accent_color:
        props["accentColor"] = args.accent_color

    os.makedirs(os.path.dirname(args.output) if os.path.dirname(args.output) else ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Props saved to: {args.output}")
    print(f"  Duration:  {duration:.1f}s")
    print(f"  Frames:    {total_frames}")
    print(f"  Style:     {args.style}")
    print(f"  Scenes:    {len(scenes)}")
    print(f"\nRender command:")
    print(f"  npx remotion render --config remotion.config.ts MontageVideo output/result.mp4 \\")
    print(f"    --props {args.output} --frames 0-{total_frames}")


if __name__ == "__main__":
    main()
