#!/usr/bin/env python3
import json
import sys

def ms_to_srt_time(seconds):
    ms = int((seconds % 1) * 1000)
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def transcript_to_srt(transcript_path, output_path, words_per_subtitle=4):
    with open(transcript_path) as f:
        data = json.load(f)
    
    # Flatten all words
    words = []
    for seg in data["segments"]:
        words.extend(seg["words"])
    
    srt_lines = []
    idx = 1
    i = 0
    
    while i < len(words):
        chunk = words[i:i + words_per_subtitle]
        start = chunk[0]["start"]
        end = chunk[-1]["end"]
        text = " ".join(w["word"] for w in chunk)
        
        srt_lines.append(f"{idx}")
        srt_lines.append(f"{ms_to_srt_time(start)} --> {ms_to_srt_time(end)}")
        srt_lines.append(text)
        srt_lines.append("")
        
        idx += 1
        i += words_per_subtitle
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    
    print(f"✓ Saved {idx-1} subtitles to {output_path}")

if __name__ == "__main__":
    transcript_to_srt(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4)
