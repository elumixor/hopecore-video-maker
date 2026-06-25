#!/usr/bin/env python3
"""
Transcribe a video/audio file using Whisper with word-level timestamps.
Output: JSON with segments and words (used by the Remotion render script).

Usage:
  python3 tools/transcribe.py path/to/video.mp4 --output-dir ./transcript
"""

import argparse
import json
import os
import sys
import warnings

def main():
    parser = argparse.ArgumentParser(description="Transcribe video with Whisper")
    parser.add_argument("input", help="Path to video or audio file")
    parser.add_argument("--output-dir", default="./transcript", help="Output directory")
    parser.add_argument("--model", default="turbo", help="Whisper model (turbo, medium, large)")
    parser.add_argument("--language", default=None, help="Language code (ru, en, etc.)")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    try:
        import whisper
    except ImportError:
        print("ERROR: whisper not installed. Run: pip install openai-whisper")
        sys.exit(1)

    basename = os.path.splitext(os.path.basename(args.input))[0]
    out_path = os.path.join(args.output_dir, f"{basename}.json")

    print(f"Running Whisper ({args.model}) on {os.path.basename(args.input)}...")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = whisper.load_model(args.model)
        result = model.transcribe(
            args.input,
            word_timestamps=True,
            language=args.language,
        )

    segments = []
    for seg in result["segments"]:
        words = [
            {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
            for w in seg.get("words", [])
        ]
        segments.append({
            "start": round(seg["start"], 3),
            "end": round(seg["end"], 3),
            "text": seg["text"].strip(),
            "words": words,
        })

    output = {
        "text": result["text"].strip(),
        "language": result["language"],
        "segments": segments,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_words = sum(len(s["words"]) for s in segments)
    duration = segments[-1]["end"] if segments else 0
    print(f"Transcription complete: {len(segments)} segments, {total_words} words, {duration:.1f}s")
    print(f"Saved to: {out_path}")
    return out_path

if __name__ == "__main__":
    main()
